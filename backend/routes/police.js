const express = require('express');
const router = express.Router();
const policeController = require('../controllers/policeController');
const authMiddleware = require('../middleware/auth');

// Get all emergencies for police
router.get('/emergencies', authMiddleware, policeController.getEmergencies);

// Get emergency details
router.get('/emergencies/:id', authMiddleware, policeController.getEmergencyDetails);

// Update emergency status
router.post('/emergencies/:id/respond', authMiddleware, policeController.respondToEmergency);

// Update patrol status
router.post('/patrol/status', authMiddleware, policeController.updatePatrolStatus);

// Get nearby units
router.get('/units/nearby', authMiddleware, policeController.getNearbyUnits);

// Update unit location
router.post('/units/location', authMiddleware, policeController.updateUnitLocation);

// Get crime statistics
router.get('/stats', authMiddleware, policeController.getCrimeStats);

// Report incident
router.post('/incidents', authMiddleware, policeController.reportIncident);

// Get incident history
router.get('/incidents', authMiddleware, policeController.getIncidentHistory);

module.exports = router;
