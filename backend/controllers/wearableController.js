const db = require('../config/database');
const wearableService = require('../services/wearableService');
const emergencyAI = require('../services/emergencyAI');
const { io } = require('../socket');
const { validateLocation, validateVitals } = require('../utils/validation');
const { calculateSafeZone } = require('../utils/locationUtils');
const { analyzeVitalSigns } = require('../utils/healthMonitoring');

class WearableController {
  // Device Registration and Management
  async registerDevice(req, res) {
    try {
      const deviceData = req.body;
      const result = await wearableService.registerDevice(deviceData);
      res.json(result);
    } catch (error) {
      console.error('Error registering device:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
  }

  async updateDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const updates = req.body;
      const result = await wearableService.updateDevice(deviceId, updates);
      res.json(result);
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({ error: 'Failed to update device' });
    }
  }

  // Child Monitoring
  async setupChildMonitoring(req, res) {
    try {
      const monitoringData = req.body;
      const result = await wearableService.setupChildMonitoring(monitoringData);
      res.json(result);
    } catch (error) {
      console.error('Error setting up monitoring:', error);
      res.status(500).json({ error: 'Failed to setup monitoring' });
    }
  }

  async updateMonitoringSettings(req, res) {
    try {
      const { deviceId } = req.params;
      const settings = req.body;
      const result = await wearableService.updateMonitoringSettings(deviceId, settings);
      res.json(result);
    } catch (error) {
      console.error('Error updating monitoring settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  // Location Tracking
  async updateLocation(req, res) {
    try {
      const { deviceId } = req.device;
      const locationData = req.body;

      if (!validateLocation(locationData)) {
        return res.status(400).json({ error: 'Invalid location data' });
      }

      // Update location in database
      await db.execute(
        'INSERT INTO device_locations (device_id, latitude, longitude, accuracy, altitude, speed, battery_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [deviceId, locationData.latitude, locationData.longitude, locationData.accuracy, 
         locationData.altitude, locationData.speed, locationData.batteryLevel]
      );

      // Check safe zones
      const violations = await this.checkSafeZoneViolations(deviceId, locationData);
      if (violations.length > 0) {
        await this.handleSafeZoneViolations(deviceId, violations);
      }

      // Notify monitoring services
      io.to(`device_${deviceId}`).emit('locationUpdate', {
        deviceId,
        location: locationData,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  }

  // Vital Signs Monitoring
  async updateVitalSigns(req, res) {
    try {
      const { deviceId } = req.device;
      const vitalsData = req.body;

      if (!validateVitals(vitalsData)) {
        return res.status(400).json({ error: 'Invalid vitals data' });
      }

      // Store vital signs
      await db.execute(
        'INSERT INTO vital_signs (device_id, heart_rate, temperature, blood_oxygen, steps, activity_level, stress_level, sleep_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [deviceId, vitalsData.heartRate, vitalsData.temperature, vitalsData.bloodOxygen,
         vitalsData.steps, vitalsData.activityLevel, vitalsData.stressLevel, vitalsData.sleepState]
      );

      // Analyze vitals for anomalies
      const analysis = await analyzeVitalSigns(vitalsData);
      if (analysis.alerts.length > 0) {
        await this.handleHealthAlerts(deviceId, analysis.alerts);
      }

      // Notify monitoring services
      io.to(`device_${deviceId}`).emit('vitalsUpdate', {
        deviceId,
        vitals: vitalsData,
        analysis,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating vital signs:', error);
      res.status(500).json({ error: 'Failed to update vital signs' });
    }
  }

  // Safe Zone Management
  async createSafeZone(req, res) {
    try {
      const zoneData = req.body;
      const geometry = calculateSafeZone(zoneData.coordinates);

      const [result] = await db.execute(
        'INSERT INTO safe_zones (device_id, name, type, geometry, schedule) VALUES (?, ?, ?, ST_GeomFromGeoJSON(?), ?)',
        [zoneData.deviceId, zoneData.name, zoneData.type, JSON.stringify(geometry), JSON.stringify(zoneData.schedule)]
      );

      res.json({
        success: true,
        zoneId: result.insertId,
        geometry
      });
    } catch (error) {
      console.error('Error creating safe zone:', error);
      res.status(500).json({ error: 'Failed to create safe zone' });
    }
  }

  // Emergency Management
  async triggerEmergency(req, res) {
    try {
      const { deviceId } = req.device;
      const emergencyData = req.body;

      // Create emergency record
      const [result] = await db.execute(
        'INSERT INTO emergencies (device_id, type, data) VALUES (?, ?, ?)',
        [deviceId, emergencyData.type, JSON.stringify(emergencyData)]
      );

      const emergencyId = result.insertId;

      // Get device details and current status
      const deviceStatus = await this.getDeviceStatus(deviceId);
      
      // Assess emergency severity
      const assessment = await emergencyAI.assessEmergency({
        ...emergencyData,
        deviceStatus
      });

      // Update emergency with assessment
      await db.execute(
        'UPDATE emergencies SET severity = ?, assessment = ? WHERE id = ?',
        [assessment.severity, JSON.stringify(assessment), emergencyId]
      );

      // Notify emergency contacts
      await this.notifyEmergencyContacts(deviceId, {
        emergencyId,
        type: emergencyData.type,
        assessment
      });

      // If severe, notify emergency services
      if (assessment.severity >= 0.7) {
        await this.notifyEmergencyServices(emergencyId, assessment);
      }

      res.json({
        success: true,
        emergencyId,
        assessment
      });
    } catch (error) {
      console.error('Error triggering emergency:', error);
      res.status(500).json({ error: 'Failed to trigger emergency' });
    }
  }

  // Parent Dashboard Data
  async getChildrenOverview(req, res) {
    try {
      const { parentId } = req.params;

      // Get all children devices for parent
      const [devices] = await db.execute(
        `SELECT d.*, cm.settings,
                dl.latitude, dl.longitude, dl.updated_at as location_updated_at,
                vs.heart_rate, vs.temperature, vs.activity_level
         FROM wearable_devices d
         JOIN child_monitoring cm ON d.device_id = cm.device_id
         LEFT JOIN device_locations dl ON d.device_id = dl.device_id
         LEFT JOIN vital_signs vs ON d.device_id = vs.device_id
         WHERE cm.parent_id = ?
         AND dl.id = (SELECT id FROM device_locations WHERE device_id = d.device_id ORDER BY updated_at DESC LIMIT 1)
         AND vs.id = (SELECT id FROM vital_signs WHERE device_id = d.device_id ORDER BY recorded_at DESC LIMIT 1)`,
        [parentId]
      );

      // Get recent alerts
      const [alerts] = await db.execute(
        `SELECT * FROM (
           SELECT 'health' as alert_type, * FROM health_alerts
           WHERE device_id IN (SELECT device_id FROM child_monitoring WHERE parent_id = ?)
           UNION ALL
           SELECT 'safety' as alert_type, * FROM safety_alerts
           WHERE device_id IN (SELECT device_id FROM child_monitoring WHERE parent_id = ?)
         ) alerts
         ORDER BY created_at DESC
         LIMIT 10`,
        [parentId, parentId]
      );

      res.json({
        children: devices,
        alerts
      });
    } catch (error) {
      console.error('Error getting children overview:', error);
      res.status(500).json({ error: 'Failed to get children overview' });
    }
  }

  // Analytics and Reports
  async getHealthAnalytics(req, res) {
    try {
      const { deviceId } = req.params;
      const { startDate, endDate } = req.query;

      // Get vital signs history
      const [vitals] = await db.execute(
        `SELECT * FROM vital_signs
         WHERE device_id = ?
         AND recorded_at BETWEEN ? AND ?
         ORDER BY recorded_at ASC`,
        [deviceId, startDate, endDate]
      );

      // Get health alerts
      const [alerts] = await db.execute(
        `SELECT * FROM health_alerts
         WHERE device_id = ?
         AND created_at BETWEEN ? AND ?
         ORDER BY created_at ASC`,
        [deviceId, startDate, endDate]
      );

      // Calculate analytics
      const analytics = {
        averageHeartRate: this.calculateAverage(vitals, 'heart_rate'),
        averageTemperature: this.calculateAverage(vitals, 'temperature'),
        activityLevels: this.calculateActivityDistribution(vitals),
        alertFrequency: this.calculateAlertFrequency(alerts),
        trends: this.calculateHealthTrends(vitals)
      };

      res.json(analytics);
    } catch (error) {
      console.error('Error getting health analytics:', error);
      res.status(500).json({ error: 'Failed to get health analytics' });
    }
  }

  // Utility Methods
  async checkSafeZoneViolations(deviceId, location) {
    const [zones] = await db.execute(
      `SELECT * FROM safe_zones
       WHERE device_id = ?
       AND ST_Contains(geometry, ST_Point(?, ?)) = false`,
      [deviceId, location.longitude, location.latitude]
    );

    return zones;
  }

  async handleSafeZoneViolations(deviceId, violations) {
    for (const zone of violations) {
      // Create safety alert
      await db.execute(
        'INSERT INTO safety_alerts (device_id, type, data) VALUES (?, "zone_violation", ?)',
        [deviceId, JSON.stringify({ zoneId: zone.id, zoneName: zone.name })]
      );

      // Notify monitoring services
      io.to(`device_${deviceId}`).emit('safetyAlert', {
        type: 'zone_violation',
        zone: zone.name,
        timestamp: new Date()
      });
    }
  }

  async handleHealthAlerts(deviceId, alerts) {
    for (const alert of alerts) {
      // Create health alert
      await db.execute(
        'INSERT INTO health_alerts (device_id, type, data) VALUES (?, ?, ?)',
        [deviceId, alert.type, JSON.stringify(alert)]
      );

      // Notify monitoring services
      io.to(`device_${deviceId}`).emit('healthAlert', {
        type: alert.type,
        data: alert,
        timestamp: new Date()
      });
    }
  }

  calculateAverage(data, field) {
    return data.reduce((sum, item) => sum + item[field], 0) / data.length;
  }

  calculateActivityDistribution(vitals) {
    return vitals.reduce((dist, vital) => {
      dist[vital.activity_level] = (dist[vital.activity_level] || 0) + 1;
      return dist;
    }, {});
  }

  calculateAlertFrequency(alerts) {
    return alerts.reduce((freq, alert) => {
      freq[alert.type] = (freq[alert.type] || 0) + 1;
      return freq;
    }, {});
  }

  calculateHealthTrends(vitals) {
    // Implement trend analysis logic
    return {
      heartRate: this.calculateTrend(vitals, 'heart_rate'),
      temperature: this.calculateTrend(vitals, 'temperature'),
      activity: this.calculateTrend(vitals, 'activity_level')
    };
  }

  calculateTrend(data, field) {
    // Simple linear regression
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d[field]);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return {
      slope,
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
    };
  }
}

module.exports = new WearableController();
