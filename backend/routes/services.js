const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const locationController = require('../controllers/locationController');
const emergencyController = require('../controllers/emergencyController');

// Location tracking routes
router.post('/tracking/start', authenticateToken, locationController.startTracking);
router.post('/tracking/stop', authenticateToken, locationController.stopTracking);
router.get('/nearby', authenticateToken, locationController.getNearbyServices);
router.post('/location/update', authenticateToken, locationController.updateServiceLocation);

// Emergency routes
router.post('/emergency/sos', authenticateToken, emergencyController.sendSOS);
router.post('/emergency/status', authenticateToken, emergencyController.updateSOSStatus);

module.exports = router;
