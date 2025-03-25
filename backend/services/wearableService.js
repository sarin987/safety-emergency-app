const db = require('../config/database');
const { io } = require('../socket');
const { analyzeVitalSigns } = require('../utils/healthMonitoring');
const { calculateSafeZone } = require('../utils/locationUtils');
const emergencyAI = require('./emergencyAI');

class WearableService {
  constructor() {
    this.activeDevices = new Map();
    this.safeZones = new Map();
    this.alertThresholds = new Map();
    this.emergencyContacts = new Map();
  }

  async registerDevice(deviceData) {
    const {
      deviceId,
      userId,
      deviceType,
      capabilities,
      emergencyContacts
    } = deviceData;

    // Register device in database
    await db.execute(
      'INSERT INTO wearable_devices (device_id, user_id, device_type, capabilities) VALUES (?, ?, ?, ?)',
      [deviceId, userId, deviceType, JSON.stringify(capabilities)]
    );

    // Set up monitoring
    this.activeDevices.set(deviceId, {
      userId,
      deviceType,
      capabilities,
      lastUpdate: Date.now(),
      status: 'active'
    });

    // Store emergency contacts
    this.emergencyContacts.set(deviceId, emergencyContacts);

    return { success: true, deviceId };
  }

  async setupChildMonitoring(childData) {
    const {
      deviceId,
      parentId,
      schoolId,
      safeZones,
      alertSettings
    } = childData;

    // Store safe zones (school, home, allowed areas)
    this.safeZones.set(deviceId, safeZones.map(zone => ({
      ...zone,
      geometry: calculateSafeZone(zone)
    })));

    // Set up alert thresholds
    this.alertThresholds.set(deviceId, {
      ...alertSettings,
      vitalSigns: {
        heartRate: { min: 60, max: 120 },
        temperature: { min: 97, max: 99 },
        ...alertSettings.vitalSigns
      }
    });

    // Create monitoring session
    await db.execute(
      'INSERT INTO child_monitoring (device_id, parent_id, school_id, settings) VALUES (?, ?, ?, ?)',
      [deviceId, parentId, schoolId, JSON.stringify(alertSettings)]
    );

    // Start real-time monitoring
    this.startChildMonitoring(deviceId);

    return { success: true, monitoringActive: true };
  }

  async startChildMonitoring(deviceId) {
    const monitor = {
      locationInterval: setInterval(() => this.checkLocation(deviceId), 30000),
      vitalsInterval: setInterval(() => this.checkVitalSigns(deviceId), 60000),
      activityInterval: setInterval(() => this.checkActivity(deviceId), 300000),
      panicHandler: this.setupPanicDetection(deviceId)
    };

    this.activeDevices.get(deviceId).monitoring = monitor;
  }

  async checkLocation(deviceId) {
    const device = this.activeDevices.get(deviceId);
    if (!device) return;

    try {
      // Get current location from device
      const location = await this.getDeviceLocation(deviceId);
      
      // Check if within safe zones
      const safeZones = this.safeZones.get(deviceId);
      const inSafeZone = safeZones.some(zone => 
        zone.geometry.contains(location)
      );

      if (!inSafeZone) {
        await this.handleSafeZoneViolation(deviceId, location);
      }

      // Update last known location
      await db.execute(
        'UPDATE device_locations SET latitude = ?, longitude = ?, updated_at = NOW() WHERE device_id = ?',
        [location.latitude, location.longitude, deviceId]
      );

      // Notify parent app
      this.notifyParent(deviceId, 'locationUpdate', {
        location,
        inSafeZone,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error checking location:', error);
      this.handleMonitoringError(deviceId, 'location', error);
    }
  }

  async checkVitalSigns(deviceId) {
    const device = this.activeDevices.get(deviceId);
    if (!device) return;

    try {
      // Get vital signs from device
      const vitals = await this.getDeviceVitals(deviceId);
      
      // Analyze vital signs
      const analysis = await analyzeVitalSigns(vitals);
      
      // Check against thresholds
      const thresholds = this.alertThresholds.get(deviceId).vitalSigns;
      const alerts = this.checkVitalThresholds(vitals, thresholds);

      if (alerts.length > 0) {
        await this.handleVitalSignAlert(deviceId, alerts, vitals);
      }

      // Update database
      await db.execute(
        'INSERT INTO vital_signs (device_id, data, analysis) VALUES (?, ?, ?)',
        [deviceId, JSON.stringify(vitals), JSON.stringify(analysis)]
      );

      // Notify parent app
      this.notifyParent(deviceId, 'vitalsUpdate', {
        vitals,
        analysis,
        alerts,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error checking vital signs:', error);
      this.handleMonitoringError(deviceId, 'vitals', error);
    }
  }

  async checkActivity(deviceId) {
    const device = this.activeDevices.get(deviceId);
    if (!device) return;

    try {
      // Get activity data from device
      const activity = await this.getDeviceActivity(deviceId);
      
      // Analyze activity patterns
      const analysis = await this.analyzeActivity(activity);
      
      // Check for unusual patterns
      if (analysis.unusual) {
        await this.handleUnusualActivity(deviceId, analysis);
      }

      // Update database
      await db.execute(
        'INSERT INTO activity_logs (device_id, data, analysis) VALUES (?, ?, ?)',
        [deviceId, JSON.stringify(activity), JSON.stringify(analysis)]
      );

      // Notify parent app
      this.notifyParent(deviceId, 'activityUpdate', {
        activity,
        analysis,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error checking activity:', error);
      this.handleMonitoringError(deviceId, 'activity', error);
    }
  }

  setupPanicDetection(deviceId) {
    // Listen for panic button or fall detection
    return (event) => {
      if (event.type === 'panic' || event.type === 'fall') {
        this.handleEmergency(deviceId, event);
      }
    };
  }

  async handleEmergency(deviceId, event) {
    try {
      // Get device details
      const device = this.activeDevices.get(deviceId);
      const location = await this.getDeviceLocation(deviceId);
      const vitals = await this.getDeviceVitals(deviceId);

      // Create emergency record
      const emergency = {
        deviceId,
        userId: device.userId,
        type: event.type,
        location,
        vitals,
        timestamp: Date.now()
      };

      // Assess emergency severity
      const assessment = await emergencyAI.assessEmergency({
        ...emergency,
        deviceData: device
      });

      // Store emergency
      const [result] = await db.execute(
        'INSERT INTO emergencies (device_id, user_id, type, data, severity) VALUES (?, ?, ?, ?, ?)',
        [deviceId, device.userId, event.type, JSON.stringify(emergency), assessment.severity]
      );

      // Notify emergency contacts
      await this.notifyEmergencyContacts(deviceId, {
        emergency,
        assessment
      });

      // Notify emergency services if necessary
      if (assessment.severity >= 0.7) {
        await this.notifyEmergencyServices(emergency, assessment);
      }

      // Notify parent app
      this.notifyParent(deviceId, 'emergency', {
        emergency,
        assessment,
        emergencyId: result.insertId
      });
    } catch (error) {
      console.error('Error handling emergency:', error);
      // Fallback emergency notification
      this.sendFallbackEmergencyAlert(deviceId, event);
    }
  }

  async handleSafeZoneViolation(deviceId, location) {
    const device = this.activeDevices.get(deviceId);
    const contacts = this.emergencyContacts.get(deviceId);

    // Create alert
    const alert = {
      type: 'safe_zone_violation',
      deviceId,
      userId: device.userId,
      location,
      timestamp: Date.now()
    };

    // Store alert
    await db.execute(
      'INSERT INTO safety_alerts (device_id, type, data) VALUES (?, ?, ?)',
      [deviceId, alert.type, JSON.stringify(alert)]
    );

    // Notify contacts
    contacts.forEach(contact => {
      io.to(`user_${contact.id}`).emit('safetyAlert', alert);
    });
  }

  async handleVitalSignAlert(deviceId, alerts, vitals) {
    const device = this.activeDevices.get(deviceId);
    const contacts = this.emergencyContacts.get(deviceId);

    // Create health alert
    const alert = {
      type: 'vital_signs_alert',
      deviceId,
      userId: device.userId,
      alerts,
      vitals,
      timestamp: Date.now()
    };

    // Store alert
    await db.execute(
      'INSERT INTO health_alerts (device_id, type, data) VALUES (?, ?, ?)',
      [deviceId, alert.type, JSON.stringify(alert)]
    );

    // Notify contacts
    contacts.forEach(contact => {
      io.to(`user_${contact.id}`).emit('healthAlert', alert);
    });
  }

  notifyParent(deviceId, eventType, data) {
    const device = this.activeDevices.get(deviceId);
    if (!device) return;

    io.to(`user_${device.userId}`).emit(eventType, {
      deviceId,
      ...data
    });
  }

  // Cleanup
  async stopMonitoring(deviceId) {
    const device = this.activeDevices.get(deviceId);
    if (!device || !device.monitoring) return;

    // Clear monitoring intervals
    clearInterval(device.monitoring.locationInterval);
    clearInterval(device.monitoring.vitalsInterval);
    clearInterval(device.monitoring.activityInterval);

    // Remove device from active monitoring
    this.activeDevices.delete(deviceId);
    this.safeZones.delete(deviceId);
    this.alertThresholds.delete(deviceId);
    this.emergencyContacts.delete(deviceId);

    // Update database
    await db.execute(
      'UPDATE wearable_devices SET status = "inactive" WHERE device_id = ?',
      [deviceId]
    );
  }
}

module.exports = new WearableService();
