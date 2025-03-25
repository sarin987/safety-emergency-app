const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { io } = require('../socket');
const mlService = require('./mlService');

class SecurityService {
  constructor() {
    this.securityRules = new Map();
    this.deviceSessions = new Map();
    this.threatPatterns = new Set();
    this.initialize();
  }

  async initialize() {
    // Load security rules
    await this.loadSecurityRules();
    
    // Initialize threat detection
    this.initializeThreatDetection();
    
    // Start security monitoring
    this.startSecurityMonitoring();
  }

  async loadSecurityRules() {
    try {
      const [rules] = await db.execute('SELECT * FROM security_rules WHERE status = "active"');
      rules.forEach(rule => {
        this.securityRules.set(rule.id, {
          ...rule,
          pattern: new RegExp(rule.pattern),
          handler: this.createRuleHandler(rule)
        });
      });
    } catch (error) {
      console.error('Error loading security rules:', error);
    }
  }

  // Device Authentication and Verification
  async authenticateDevice(deviceId, credentials) {
    try {
      // Verify device credentials
      const [device] = await db.execute(
        'SELECT * FROM wearable_devices WHERE device_id = ?',
        [deviceId]
      );

      if (!device) {
        throw new Error('Device not found');
      }

      // Verify device signature
      const isValid = this.verifyDeviceSignature(credentials, device.public_key);
      if (!isValid) {
        throw new Error('Invalid device signature');
      }

      // Create device session
      const session = await this.createDeviceSession(device);
      
      // Start monitoring device security
      this.monitorDeviceSecurity(deviceId);

      return session;
    } catch (error) {
      console.error('Device authentication error:', error);
      throw error;
    }
  }

  async createDeviceSession(device) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const token = this.generateDeviceToken(device, sessionId);

    this.deviceSessions.set(sessionId, {
      deviceId: device.device_id,
      startTime: Date.now(),
      lastActivity: Date.now(),
      securityLevel: 'normal',
      anomalyCount: 0
    });

    return {
      sessionId,
      token,
      expiresIn: 3600 // 1 hour
    };
  }

  // Real-time Security Monitoring
  monitorDeviceSecurity(deviceId) {
    const monitor = {
      locationCheck: setInterval(() => this.checkLocationAnomaly(deviceId), 60000),
      activityCheck: setInterval(() => this.checkActivityAnomaly(deviceId), 300000),
      threatCheck: setInterval(() => this.checkThreatPatterns(deviceId), 180000)
    };

    return monitor;
  }

  async checkLocationAnomaly(deviceId) {
    try {
      // Get recent locations
      const [locations] = await db.execute(
        `SELECT * FROM device_locations 
         WHERE device_id = ? 
         ORDER BY updated_at DESC 
         LIMIT 10`,
        [deviceId]
      );

      // Check for location-based anomalies
      const anomalies = await mlService.detectAnomalies(deviceId, {
        type: 'location',
        data: locations
      });

      if (anomalies.severity >= 0.7) {
        await this.handleSecurityThreat({
          deviceId,
          type: 'location_anomaly',
          data: anomalies,
          severity: anomalies.severity
        });
      }
    } catch (error) {
      console.error('Error checking location anomaly:', error);
    }
  }

  async checkActivityAnomaly(deviceId) {
    try {
      // Analyze recent activity patterns
      const patterns = await mlService.analyzeBehaviorPattern(deviceId);

      if (patterns.anomalies.length > 0) {
        await this.handleSecurityThreat({
          deviceId,
          type: 'activity_anomaly',
          data: patterns,
          severity: Math.max(...patterns.anomalies.map(a => a.severity))
        });
      }
    } catch (error) {
      console.error('Error checking activity anomaly:', error);
    }
  }

  async checkThreatPatterns(deviceId) {
    try {
      // Get device session
      const session = this.getDeviceSession(deviceId);
      if (!session) return;

      // Check for known threat patterns
      const threats = Array.from(this.threatPatterns)
        .filter(pattern => pattern.test(session));

      if (threats.length > 0) {
        await this.handleSecurityThreat({
          deviceId,
          type: 'threat_pattern',
          data: threats,
          severity: 0.8
        });
      }
    } catch (error) {
      console.error('Error checking threat patterns:', error);
    }
  }

  // Threat Detection and Response
  async handleSecurityThreat(threat) {
    try {
      // Log threat
      await db.execute(
        'INSERT INTO security_threats (device_id, type, data, severity) VALUES (?, ?, ?, ?)',
        [threat.deviceId, threat.type, JSON.stringify(threat.data), threat.severity]
      );

      // Update device security level
      this.updateDeviceSecurityLevel(threat.deviceId, threat.severity);

      // Notify monitoring system
      io.to(`device_${threat.deviceId}`).emit('securityThreat', {
        type: threat.type,
        severity: threat.severity,
        timestamp: new Date()
      });

      // Take automated response actions
      await this.executeSecurityResponse(threat);
    } catch (error) {
      console.error('Error handling security threat:', error);
    }
  }

  async executeSecurityResponse(threat) {
    const responses = {
      location_anomaly: async () => {
        await this.triggerLocationVerification(threat.deviceId);
        await this.notifySecurityContacts(threat);
      },
      activity_anomaly: async () => {
        await this.increaseMonitoringFrequency(threat.deviceId);
        await this.requestActivityVerification(threat.deviceId);
      },
      threat_pattern: async () => {
        await this.lockDeviceFeatures(threat.deviceId);
        await this.notifyAdministrators(threat);
      }
    };

    if (responses[threat.type]) {
      await responses[threat.type]();
    }
  }

  // Security Level Management
  updateDeviceSecurityLevel(deviceId, threatSeverity) {
    const session = this.deviceSessions.get(deviceId);
    if (!session) return;

    // Update security level based on threat severity
    if (threatSeverity >= 0.8) {
      session.securityLevel = 'critical';
    } else if (threatSeverity >= 0.6) {
      session.securityLevel = 'high';
    } else if (threatSeverity >= 0.4) {
      session.securityLevel = 'elevated';
    }

    // Update anomaly count
    session.anomalyCount++;

    // Apply security measures based on new level
    this.applySecurityMeasures(deviceId, session.securityLevel);
  }

  async applySecurityMeasures(deviceId, securityLevel) {
    const measures = {
      critical: async () => {
        await this.lockDeviceFeatures(deviceId);
        await this.requireReauthentication(deviceId);
        await this.notifyAllContacts(deviceId);
      },
      high: async () => {
        await this.increaseSecurity(deviceId);
        await this.notifyPrimaryContact(deviceId);
      },
      elevated: async () => {
        await this.enableExtraMonitoring(deviceId);
      }
    };

    if (measures[securityLevel]) {
      await measures[securityLevel]();
    }
  }

  // Utility Methods
  generateDeviceToken(device, sessionId) {
    return jwt.sign(
      {
        deviceId: device.device_id,
        sessionId,
        type: 'device'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  verifyDeviceSignature(credentials, publicKey) {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(credentials.data);
      return verify.verify(publicKey, credentials.signature, 'base64');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  async lockDeviceFeatures(deviceId) {
    await db.execute(
      'UPDATE wearable_devices SET status = "locked" WHERE device_id = ?',
      [deviceId]
    );

    io.to(`device_${deviceId}`).emit('deviceLocked', {
      reason: 'security_threat',
      timestamp: new Date()
    });
  }

  async notifySecurityContacts(threat) {
    const [contacts] = await db.execute(
      'SELECT * FROM emergency_contacts WHERE device_id = ? AND notify_security = true',
      [threat.deviceId]
    );

    contacts.forEach(contact => {
      io.to(`user_${contact.contact_id}`).emit('securityAlert', {
        deviceId: threat.deviceId,
        type: threat.type,
        severity: threat.severity,
        timestamp: new Date()
      });
    });
  }
}

module.exports = new SecurityService();
