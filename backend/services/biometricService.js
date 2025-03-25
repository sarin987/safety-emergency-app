const tf = require('@tensorflow/tfjs-node');
const crypto = require('crypto');
const db = require('../config/database');
const { loadModel } = require('../utils/modelLoader');
const securityService = require('./securityService');

class BiometricService {
  constructor() {
    this.models = {
      fingerprint: null,
      faceRecognition: null,
      voicePrint: null,
      gaitAnalysis: null,
      behavioralBiometrics: null
    };
    this.templates = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // Load biometric models
      this.models.fingerprint = await loadModel('fingerprint_recognition');
      this.models.faceRecognition = await loadModel('face_recognition');
      this.models.voicePrint = await loadModel('voice_recognition');
      this.models.gaitAnalysis = await loadModel('gait_analysis');
      this.models.behavioralBiometrics = await loadModel('behavioral_biometrics');
    } catch (error) {
      console.error('Error initializing biometric models:', error);
    }
  }

  async enrollBiometrics(userId, biometricData) {
    try {
      // Process and validate biometric data
      const processedData = await this.processBiometricData(biometricData);

      // Generate secure templates
      const templates = await this.generateBiometricTemplates(processedData);

      // Store encrypted templates
      await this.storeBiometricTemplates(userId, templates);

      // Generate authentication policy
      const policy = await this.generateAuthPolicy(userId, templates);

      return {
        enrolled: true,
        templates: templates.map(t => t.id),
        policy
      };
    } catch (error) {
      console.error('Error enrolling biometrics:', error);
      throw error;
    }
  }

  async authenticateUser(userId, biometricData) {
    try {
      // Get stored templates
      const templates = await this.getBiometricTemplates(userId);

      // Process authentication data
      const processedData = await this.processBiometricData(biometricData);

      // Perform multi-modal biometric matching
      const matches = await this.performBiometricMatching(processedData, templates);

      // Calculate authentication score
      const authScore = this.calculateAuthenticationScore(matches);

      // Verify against policy
      const verified = await this.verifyAuthenticationPolicy(userId, authScore);

      if (verified) {
        // Generate session token
        const session = await this.createAuthenticatedSession(userId);

        return {
          authenticated: true,
          session,
          confidence: authScore.confidence
        };
      }

      return {
        authenticated: false,
        reason: 'Biometric verification failed'
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  async verifyLiveness(biometricData) {
    try {
      const livenessChecks = {
        facial: await this.performFacialLivenessCheck(biometricData.facial),
        fingerprint: await this.performFingerprintLivenessCheck(biometricData.fingerprint),
        voice: await this.performVoiceLivenessCheck(biometricData.voice)
      };

      // Calculate overall liveness score
      const livenessScore = this.calculateLivenessScore(livenessChecks);

      return {
        isLive: livenessScore.score >= 0.95,
        confidence: livenessScore.confidence,
        checks: livenessChecks
      };
    } catch (error) {
      console.error('Error verifying liveness:', error);
      throw error;
    }
  }

  async performContinuousAuthentication(userId, sessionId) {
    try {
      // Get session data
      const session = await this.getAuthenticationSession(sessionId);
      if (!session) throw new Error('Invalid session');

      // Get continuous biometric data
      const continuousData = await this.getContinuousBiometricData(userId);

      // Perform behavioral biometric analysis
      const behavioralMatch = await this.analyzeBehavioralBiometrics(
        userId,
        continuousData
      );

      // Verify continuous authentication
      const verified = await this.verifyContinuousAuth(behavioralMatch);

      if (!verified) {
        await this.handleAuthenticationFailure(userId, sessionId);
        return false;
      }

      // Update session
      await this.updateAuthenticationSession(sessionId);

      return true;
    } catch (error) {
      console.error('Error performing continuous authentication:', error);
      throw error;
    }
  }

  // Template Management
  async generateBiometricTemplates(biometricData) {
    const templates = {
      fingerprint: await this.generateFingerprintTemplate(biometricData.fingerprint),
      facial: await this.generateFacialTemplate(biometricData.facial),
      voice: await this.generateVoicePrintTemplate(biometricData.voice),
      gait: await this.generateGaitTemplate(biometricData.gait),
      behavioral: await this.generateBehavioralTemplate(biometricData.behavioral)
    };

    // Encrypt templates
    return this.encryptTemplates(templates);
  }

  async storeBiometricTemplates(userId, templates) {
    // Store encrypted templates in database
    await db.execute(
      'INSERT INTO biometric_templates (user_id, templates, created_at) VALUES (?, ?, NOW())',
      [userId, JSON.stringify(templates)]
    );

    // Cache templates
    this.templates.set(userId, templates);
  }

  // Biometric Processing
  async processBiometricData(data) {
    return {
      fingerprint: await this.processFingerprintData(data.fingerprint),
      facial: await this.processFacialData(data.facial),
      voice: await this.processVoiceData(data.voice),
      gait: await this.processGaitData(data.gait),
      behavioral: await this.processBehavioralData(data.behavioral)
    };
  }

  async performBiometricMatching(data, templates) {
    const matches = {
      fingerprint: await this.matchFingerprint(data.fingerprint, templates.fingerprint),
      facial: await this.matchFacial(data.facial, templates.facial),
      voice: await this.matchVoicePrint(data.voice, templates.voice),
      gait: await this.matchGait(data.gait, templates.gait),
      behavioral: await this.matchBehavioral(data.behavioral, templates.behavioral)
    };

    return this.fusionMatchResults(matches);
  }

  // Liveness Detection
  async performFacialLivenessCheck(facialData) {
    if (!facialData) return { isLive: false, confidence: 0 };

    // Extract facial features
    const features = await this.extractFacialFeatures(facialData);

    // Perform depth analysis
    const depthAnalysis = await this.analyzeFacialDepth(features);

    // Check for micro-expressions
    const microExpressions = await this.detectMicroExpressions(features);

    // Analyze texture patterns
    const textureAnalysis = await this.analyzeFacialTexture(features);

    return {
      isLive: depthAnalysis.isLive && microExpressions.detected && textureAnalysis.natural,
      confidence: (depthAnalysis.confidence + microExpressions.confidence + textureAnalysis.confidence) / 3
    };
  }

  async performFingerprintLivenessCheck(fingerprintData) {
    if (!fingerprintData) return { isLive: false, confidence: 0 };

    // Analyze ridge patterns
    const ridgeAnalysis = await this.analyzeRidgePatterns(fingerprintData);

    // Check for pulse
    const pulseDetection = await this.detectFingerprintPulse(fingerprintData);

    // Analyze skin texture
    const textureAnalysis = await this.analyzeFingerprintTexture(fingerprintData);

    return {
      isLive: ridgeAnalysis.valid && pulseDetection.detected && textureAnalysis.natural,
      confidence: (ridgeAnalysis.confidence + pulseDetection.confidence + textureAnalysis.confidence) / 3
    };
  }

  // Continuous Authentication
  async analyzeBehavioralBiometrics(userId, data) {
    // Get stored behavioral template
    const template = await this.getBehavioralTemplate(userId);

    // Extract current behavioral features
    const features = await this.extractBehavioralFeatures(data);

    // Compare with template
    const comparison = await this.models.behavioralBiometrics.compare(features, template);

    return {
      matched: comparison.score >= 0.9,
      confidence: comparison.confidence,
      features: comparison.matchedFeatures
    };
  }

  // Security Methods
  encryptTemplates(templates) {
    return Object.entries(templates).reduce((encrypted, [key, template]) => {
      encrypted[key] = {
        data: this.encryptData(template.data),
        metadata: template.metadata
      };
      return encrypted;
    }, {});
  }

  encryptData(data) {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      key: key.toString('hex'),
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  // Session Management
  async createAuthenticatedSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const token = this.generateSessionToken(userId, sessionId);

    await db.execute(
      'INSERT INTO auth_sessions (session_id, user_id, token, created_at) VALUES (?, ?, ?, NOW())',
      [sessionId, userId, token]
    );

    return {
      sessionId,
      token,
      expiresIn: 3600
    };
  }

  generateSessionToken(userId, sessionId) {
    const payload = {
      userId,
      sessionId,
      timestamp: Date.now()
    };

    return crypto
      .createHmac('sha256', process.env.SESSION_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}

module.exports = new BiometricService();
