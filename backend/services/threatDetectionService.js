const tf = require('@tensorflow/tfjs-node');
const db = require('../config/database');
const mlService = require('./mlService');
const aiService = require('./aiService');
const notificationService = require('./notificationService');

class ThreatDetectionService {
  constructor() {
    this.models = {
      threat: null,
      anomaly: null,
      pattern: null,
      environment: null,
      social: null
    };
    this.threatLevels = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // Load threat detection models
      this.models.threat = await tf.loadLayersModel('file://models/threat_detection');
      this.models.anomaly = await tf.loadLayersModel('file://models/anomaly_detection');
      this.models.pattern = await tf.loadLayersModel('file://models/pattern_recognition');
      this.models.environment = await tf.loadLayersModel('file://models/environment_analysis');
      this.models.social = await tf.loadLayersModel('file://models/social_threat');
    } catch (error) {
      console.error('Error initializing threat detection models:', error);
    }
  }

  async analyzeThreatLevel(deviceId, data) {
    try {
      // Gather comprehensive data
      const [
        locationData,
        biometricData,
        environmentalData,
        behavioralData,
        socialData
      ] = await Promise.all([
        this.getLocationData(deviceId),
        this.getBiometricData(deviceId),
        this.getEnvironmentalData(deviceId),
        aiService.analyzeChildBehavior(deviceId),
        aiService.analyzeSocialDynamics(deviceId)
      ]);

      // Analyze different threat vectors
      const analysis = {
        physical: await this.analyzePhysicalThreats(locationData, environmentalData),
        behavioral: await this.analyzeBehavioralThreats(behavioralData),
        social: await this.analyzeSocialThreats(socialData),
        health: await this.analyzeHealthThreats(biometricData),
        environmental: await this.analyzeEnvironmentalThreats(environmentalData)
      };

      // Calculate overall threat level
      const threatLevel = await this.calculateOverallThreatLevel(analysis);

      // Update threat status
      await this.updateThreatStatus(deviceId, threatLevel);

      // Handle threats if necessary
      if (threatLevel.level > 0.6) {
        await this.handleHighThreatLevel(deviceId, threatLevel);
      }

      return threatLevel;
    } catch (error) {
      console.error('Error analyzing threat level:', error);
      throw error;
    }
  }

  async analyzePhysicalThreats(locationData, environmentalData) {
    const threats = {
      location: await this.analyzeLocationSafety(locationData),
      movement: await this.analyzeMovementPatterns(locationData),
      environment: await this.analyzeEnvironmentalRisks(environmentalData),
      proximity: await this.analyzeProximityThreats(locationData)
    };

    return {
      threats,
      risk: this.calculatePhysicalRisk(threats),
      confidence: this.calculateConfidenceScore(threats)
    };
  }

  async analyzeBehavioralThreats(behavioralData) {
    const analysis = {
      patterns: await this.detectAnomalousPatterns(behavioralData),
      emotions: await this.analyzeEmotionalState(behavioralData),
      interactions: await this.analyzeSocialInteractions(behavioralData),
      activities: await this.analyzeActivityPatterns(behavioralData)
    };

    return {
      threats: this.identifyBehavioralThreats(analysis),
      risk: this.calculateBehavioralRisk(analysis),
      confidence: this.calculateConfidenceScore(analysis)
    };
  }

  async analyzeSocialThreats(socialData) {
    const analysis = {
      bullying: await this.detectBullyingPatterns(socialData),
      isolation: await this.detectSocialIsolation(socialData),
      conflicts: await this.detectSocialConflicts(socialData),
      pressure: await this.detectPeerPressure(socialData)
    };

    return {
      threats: this.identifySocialThreats(analysis),
      risk: this.calculateSocialRisk(analysis),
      confidence: this.calculateConfidenceScore(analysis)
    };
  }

  async analyzeHealthThreats(biometricData) {
    const analysis = {
      vitals: await this.analyzeVitalSigns(biometricData),
      stress: await this.analyzeStressLevels(biometricData),
      fatigue: await this.analyzeFatigueLevels(biometricData),
      medical: await this.analyzeMedicalConditions(biometricData)
    };

    return {
      threats: this.identifyHealthThreats(analysis),
      risk: this.calculateHealthRisk(analysis),
      confidence: this.calculateConfidenceScore(analysis)
    };
  }

  async analyzeEnvironmentalThreats(environmentalData) {
    const analysis = {
      weather: await this.analyzeWeatherRisks(environmentalData),
      pollution: await this.analyzePollutionLevels(environmentalData),
      noise: await this.analyzeNoiseLevels(environmentalData),
      hazards: await this.detectEnvironmentalHazards(environmentalData)
    };

    return {
      threats: this.identifyEnvironmentalThreats(analysis),
      risk: this.calculateEnvironmentalRisk(analysis),
      confidence: this.calculateConfidenceScore(analysis)
    };
  }

  async handleHighThreatLevel(deviceId, threatLevel) {
    try {
      // Get device and user information
      const [device] = await db.execute(
        'SELECT * FROM devices WHERE id = ?',
        [deviceId]
      );

      // Generate threat response
      const response = await this.generateThreatResponse(threatLevel);

      // Notify relevant parties
      await this.notifyThreatStakeholders(device, threatLevel, response);

      // Implement safety measures
      await this.implementSafetyMeasures(device, response);

      // Log threat incident
      await this.logThreatIncident(deviceId, threatLevel, response);

      return response;
    } catch (error) {
      console.error('Error handling high threat level:', error);
      throw error;
    }
  }

  async generateThreatResponse(threatLevel) {
    return {
      priority: this.calculateResponsePriority(threatLevel),
      actions: await this.determineResponseActions(threatLevel),
      notifications: this.generateNotificationPlan(threatLevel),
      escalation: this.determineEscalationLevel(threatLevel)
    };
  }

  async notifyThreatStakeholders(device, threatLevel, response) {
    // Notify emergency contacts
    await notificationService.sendSmartNotification(device.user_id, {
      type: 'emergency',
      priority: 'high',
      content: {
        title: 'High Threat Level Detected',
        body: this.generateThreatNotification(threatLevel),
        data: {
          threatLevel,
          response
        }
      }
    });

    // Notify authorities if necessary
    if (threatLevel.level > 0.8) {
      await this.notifyAuthorities(device, threatLevel);
    }
  }

  async implementSafetyMeasures(device, response) {
    // Implement immediate safety protocols
    await Promise.all([
      this.activateEmergencyMode(device),
      this.increaseSurveillance(device),
      this.restrictAccess(device),
      this.enableSafetyFeatures(device)
    ]);
  }

  // Helper methods
  calculateOverallThreatLevel(analysis) {
    const weights = {
      physical: 0.3,
      behavioral: 0.2,
      social: 0.2,
      health: 0.2,
      environmental: 0.1
    };

    const level = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (analysis[key].risk * weight);
    }, 0);

    return {
      level,
      components: analysis,
      timestamp: Date.now(),
      confidence: this.calculateOverallConfidence(analysis)
    };
  }

  async detectAnomalousPatterns(data) {
    const tensor = tf.tensor2d(this.prepareDataForAnalysis(data));
    const prediction = await this.models.anomaly.predict(tensor);
    return this.interpretAnomalyPrediction(prediction);
  }

  calculateResponsePriority(threatLevel) {
    if (threatLevel.level >= 0.8) return 'critical';
    if (threatLevel.level >= 0.6) return 'high';
    if (threatLevel.level >= 0.4) return 'medium';
    return 'low';
  }

  determineEscalationLevel(threatLevel) {
    const levels = ['normal', 'elevated', 'high', 'severe', 'critical'];
    const index = Math.floor(threatLevel.level * (levels.length - 1));
    return levels[index];
  }

  generateThreatNotification(threatLevel) {
    const priority = this.calculateResponsePriority(threatLevel);
    const escalation = this.determineEscalationLevel(threatLevel);
    
    return {
      title: `${priority.toUpperCase()} Safety Alert`,
      body: `Threat level ${escalation}. Immediate attention required.`,
      data: {
        threatLevel,
        timestamp: Date.now(),
        priority
      }
    };
  }
}

module.exports = new ThreatDetectionService();
