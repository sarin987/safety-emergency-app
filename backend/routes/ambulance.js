const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');
const authMiddleware = require('../middleware/auth');

// Get all medical emergencies
router.get('/emergencies', authMiddleware, ambulanceController.getEmergencies);

// Get emergency details
router.get('/emergencies/:id', authMiddleware, ambulanceController.getEmergencyDetails);

// Update emergency response
router.post('/emergencies/:id/respond', authMiddleware, ambulanceController.respondToEmergency);

// Update ambulance status
router.post('/status', authMiddleware, ambulanceController.updateStatus);

// Update ambulance location
router.post('/location', authMiddleware, ambulanceController.updateLocation);

// Get nearest hospitals
router.get('/hospitals/nearest', authMiddleware, ambulanceController.getNearestHospitals);

// Update patient status
router.post('/patients/:id/status', authMiddleware, ambulanceController.updatePatientStatus);

// Get patient medical info
router.get('/patients/:id/medical-info', authMiddleware, ambulanceController.getPatientMedicalInfo);

// Update ETA to hospital
router.post('/eta', authMiddleware, ambulanceController.updateEta);

// Get ambulance statistics
router.get('/stats', authMiddleware, ambulanceController.getStats);

module.exports = router;
