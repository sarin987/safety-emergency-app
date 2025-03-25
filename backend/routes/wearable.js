const express = require('express');
const router = express.Router();
const wearableController = require('../controllers/wearableController');
const auth = require('../middleware/auth');
const deviceAuth = require('../middleware/deviceAuth');

// Device Registration and Management
router.post('/devices/register', auth, wearableController.registerDevice);
router.put('/devices/:deviceId', auth, wearableController.updateDevice);
router.delete('/devices/:deviceId', auth, wearableController.deactivateDevice);
router.get('/devices/:deviceId/status', auth, wearableController.getDeviceStatus);

// Child Monitoring
router.post('/monitoring/setup', auth, wearableController.setupChildMonitoring);
router.put('/monitoring/:deviceId/settings', auth, wearableController.updateMonitoringSettings);
router.get('/monitoring/:deviceId/status', auth, wearableController.getMonitoringStatus);

// Safe Zones
router.post('/zones', auth, wearableController.createSafeZone);
router.get('/zones/:deviceId', auth, wearableController.getSafeZones);
router.put('/zones/:zoneId', auth, wearableController.updateSafeZone);
router.delete('/zones/:zoneId', auth, wearableController.deleteSafeZone);

// Location Tracking
router.post('/location/update', deviceAuth, wearableController.updateLocation);
router.get('/location/:deviceId/history', auth, wearableController.getLocationHistory);
router.get('/location/:deviceId/last', auth, wearableController.getLastLocation);

// Vital Signs
router.post('/vitals/update', deviceAuth, wearableController.updateVitalSigns);
router.get('/vitals/:deviceId/current', auth, wearableController.getCurrentVitals);
router.get('/vitals/:deviceId/history', auth, wearableController.getVitalsHistory);

// Health Monitoring
router.post('/health/alert', deviceAuth, wearableController.createHealthAlert);
router.get('/health/:deviceId/alerts', auth, wearableController.getHealthAlerts);
router.put('/health/alerts/:alertId/resolve', auth, wearableController.resolveHealthAlert);

// Safety Alerts
router.post('/safety/alert', deviceAuth, wearableController.createSafetyAlert);
router.get('/safety/:deviceId/alerts', auth, wearableController.getSafetyAlerts);
router.put('/safety/alerts/:alertId/resolve', auth, wearableController.resolveSafetyAlert);

// School Integration
router.post('/school/attendance', deviceAuth, wearableController.updateAttendance);
router.get('/school/:deviceId/attendance', auth, wearableController.getAttendanceHistory);
router.get('/school/:deviceId/schedule', auth, wearableController.getSchoolSchedule);

// Activity Tracking
router.post('/activity/log', deviceAuth, wearableController.logActivity);
router.get('/activity/:deviceId/logs', auth, wearableController.getActivityLogs);
router.get('/activity/:deviceId/summary', auth, wearableController.getActivitySummary);

// Emergency Management
router.post('/emergency/trigger', deviceAuth, wearableController.triggerEmergency);
router.post('/emergency/contacts', auth, wearableController.updateEmergencyContacts);
router.get('/emergency/:deviceId/contacts', auth, wearableController.getEmergencyContacts);

// Parent Dashboard Data
router.get('/dashboard/:parentId/children', auth, wearableController.getChildrenOverview);
router.get('/dashboard/child/:deviceId', auth, wearableController.getChildDetails);
router.get('/dashboard/alerts/:parentId', auth, wearableController.getParentAlerts);

// Analytics and Reports
router.get('/analytics/:deviceId/health', auth, wearableController.getHealthAnalytics);
router.get('/analytics/:deviceId/safety', auth, wearableController.getSafetyAnalytics);
router.get('/analytics/:deviceId/activity', auth, wearableController.getActivityAnalytics);
router.get('/reports/:deviceId/:type', auth, wearableController.generateReport);

module.exports = router;
