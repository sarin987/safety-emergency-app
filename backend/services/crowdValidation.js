const db = require('../config/database');
const { io } = require('../socket');
const { calculateTrustScore } = require('../utils/trustScoring');
const { analyzeMediaContent } = require('../utils/mediaAnalysis');
const emergencyAI = require('./emergencyAI');

class CrowdValidationService {
  constructor() {
    this.validationThreshold = 0.75; // Minimum trust score for validation
    this.maxValidationTime = 120000; // Maximum time to wait for validation (2 minutes)
    this.activeValidations = new Map();
  }

  async initiateValidation(emergency) {
    const validationSession = {
      emergencyId: emergency.id,
      startTime: Date.now(),
      reports: [],
      mediaEvidence: [],
      nearbyDevices: new Set(),
      socialMediaMentions: [],
      officialReports: [],
      trustScore: 0,
      status: 'pending'
    };

    this.activeValidations.set(emergency.id, validationSession);

    // Start collecting validation data
    await Promise.all([
      this.collectCrowdReports(emergency),
      this.monitorSocialMedia(emergency),
      this.scanNearbyDevices(emergency),
      this.checkOfficialSources(emergency)
    ]);

    // Set timeout for validation
    setTimeout(() => {
      this.finalizeValidation(emergency.id);
    }, this.maxValidationTime);

    return validationSession;
  }

  async collectCrowdReports(emergency) {
    // Notify nearby users about the emergency
    const nearbyUsers = await this.findNearbyUsers(emergency.location);
    
    io.to(nearbyUsers.map(u => `user_${u.id}`)).emit('emergencyValidationRequest', {
      emergencyId: emergency.id,
      location: emergency.location,
      type: emergency.type
    });

    // Listen for reports
    io.on('validationReport', async (report) => {
      if (report.emergencyId === emergency.id) {
        await this.processValidationReport(report);
      }
    });
  }

  async processValidationReport(report) {
    const session = this.activeValidations.get(report.emergencyId);
    if (!session) return;

    // Calculate report trust score
    const reportTrust = await this.calculateReportTrust(report);

    // Process any media attached to the report
    const mediaAnalysis = report.media ? 
      await this.processMediaEvidence(report.media) : null;

    // Add report to session
    session.reports.push({
      ...report,
      trustScore: reportTrust,
      mediaAnalysis
    });

    // Update overall trust score
    this.updateTrustScore(report.emergencyId);
  }

  async calculateReportTrust(report) {
    const factors = {
      userTrust: await this.getUserTrustScore(report.userId),
      locationAccuracy: this.calculateLocationAccuracy(report.location),
      timeRelevance: this.calculateTimeRelevance(report.timestamp),
      contentQuality: await this.assessContentQuality(report)
    };

    return calculateTrustScore(factors);
  }

  async processMediaEvidence(media) {
    // Analyze images/videos for authenticity and relevance
    const analysis = await analyzeMediaContent(media);

    // Check for tampering or manipulation
    const authenticityCheck = await this.verifyMediaAuthenticity(media);

    // Extract relevant emergency information
    const emergencyDetails = await emergencyAI.analyzeEmergencyMedia(media);

    return {
      analysis,
      authenticity: authenticityCheck,
      emergencyDetails,
      timestamp: media.timestamp,
      location: media.location
    };
  }

  async monitorSocialMedia(emergency) {
    // Monitor social media mentions in the area
    const socialMonitor = await this.initializeSocialMediaMonitor({
      location: emergency.location,
      radius: 5000, // 5km radius
      keywords: this.generateEmergencyKeywords(emergency)
    });

    socialMonitor.on('mention', async (mention) => {
      const analysis = await this.analyzeSocialMediaMention(mention);
      
      const session = this.activeValidations.get(emergency.id);
      if (session) {
        session.socialMediaMentions.push({
          ...mention,
          analysis
        });
        this.updateTrustScore(emergency.id);
      }
    });
  }

  async scanNearbyDevices(emergency) {
    // Scan for nearby devices that can provide validation
    const deviceScanner = await this.initializeDeviceScanner(emergency.location);

    deviceScanner.on('deviceFound', async (device) => {
      const session = this.activeValidations.get(emergency.id);
      if (session) {
        session.nearbyDevices.add(device.id);
        
        // Request validation from device if possible
        if (device.canProvideValidation) {
          await this.requestDeviceValidation(device, emergency);
        }
      }
    });
  }

  async checkOfficialSources(emergency) {
    // Check official emergency channels and databases
    const officialSources = [
      this.checkEmergencyServices(emergency),
      this.checkTrafficSystems(emergency),
      this.checkWeatherAlerts(emergency),
      this.checkPublicSafetySystems(emergency)
    ];

    const results = await Promise.all(officialSources);
    
    const session = this.activeValidations.get(emergency.id);
    if (session) {
      session.officialReports = results.filter(r => r !== null);
      this.updateTrustScore(emergency.id);
    }
  }

  updateTrustScore(emergencyId) {
    const session = this.activeValidations.get(emergencyId);
    if (!session) return;

    // Calculate weighted trust score based on all available data
    const weights = {
      crowdReports: 0.3,
      mediaEvidence: 0.25,
      socialMedia: 0.15,
      nearbyDevices: 0.1,
      officialSources: 0.2
    };

    const scores = {
      crowdReports: this.calculateCrowdReportScore(session.reports),
      mediaEvidence: this.calculateMediaScore(session.mediaEvidence),
      socialMedia: this.calculateSocialMediaScore(session.socialMediaMentions),
      nearbyDevices: this.calculateDeviceScore(session.nearbyDevices.size),
      officialSources: this.calculateOfficialSourceScore(session.officialReports)
    };

    session.trustScore = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (scores[key] * weight),
      0
    );

    // Auto-validate if threshold is met
    if (session.trustScore >= this.validationThreshold) {
      this.finalizeValidation(emergencyId);
    }
  }

  async finalizeValidation(emergencyId) {
    const session = this.activeValidations.get(emergencyId);
    if (!session || session.status !== 'pending') return;

    session.status = session.trustScore >= this.validationThreshold ? 
      'validated' : 'insufficient_validation';

    // Update emergency status
    await db.execute(
      'UPDATE emergencies SET validation_status = ?, trust_score = ? WHERE id = ?',
      [session.status, session.trustScore, emergencyId]
    );

    // Notify relevant parties
    io.to(`emergency_${emergencyId}`).emit('emergencyValidated', {
      emergencyId,
      status: session.status,
      trustScore: session.trustScore
    });

    // Clean up
    this.activeValidations.delete(emergencyId);
  }

  // Utility methods for score calculation
  calculateCrowdReportScore(reports) {
    if (reports.length === 0) return 0;
    return reports.reduce((sum, report) => sum + report.trustScore, 0) / reports.length;
  }

  calculateMediaScore(mediaEvidence) {
    if (mediaEvidence.length === 0) return 0;
    return mediaEvidence.reduce((sum, evidence) => {
      return sum + (evidence.analysis.relevance * evidence.authenticity);
    }, 0) / mediaEvidence.length;
  }

  calculateSocialMediaScore(mentions) {
    if (mentions.length === 0) return 0;
    return mentions.reduce((sum, mention) => sum + mention.analysis.credibility, 0) / mentions.length;
  }

  calculateDeviceScore(deviceCount) {
    // More devices = higher confidence, with diminishing returns
    return Math.min(1, Math.log10(deviceCount + 1) / Math.log10(11));
  }

  calculateOfficialSourceScore(reports) {
    if (reports.length === 0) return 0;
    return reports.reduce((sum, report) => sum + report.confidence, 0) / reports.length;
  }
}

module.exports = new CrowdValidationService();
