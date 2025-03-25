const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/auth');

// Get hospital dashboard stats
router.get('/stats', authMiddleware, hospitalController.getStats);

// Get bed capacity
router.get('/capacity', authMiddleware, hospitalController.getBedCapacity);

// Update bed capacity
router.post('/capacity', authMiddleware, hospitalController.updateBedCapacity);

// Get all patients
router.get('/patients', authMiddleware, hospitalController.getPatients);

// Get patient details
router.get('/patients/:id', authMiddleware, hospitalController.getPatientDetails);

// Update patient status
router.post('/patients/:id/status', authMiddleware, hospitalController.updatePatientStatus);

// Admit patient
router.post('/patients/:id/admit', authMiddleware, hospitalController.admitPatient);

// Discharge patient
router.post('/patients/:id/discharge', authMiddleware, hospitalController.dischargePatient);

// Get incoming patients
router.get('/incoming', authMiddleware, hospitalController.getIncomingPatients);

// Accept/decline incoming patient
router.post('/incoming/:id/respond', authMiddleware, hospitalController.respondToIncomingPatient);

// Get department status
router.get('/departments', authMiddleware, hospitalController.getDepartmentStatus);

// Update department status
router.post('/departments/:id/status', authMiddleware, hospitalController.updateDepartmentStatus);

// Get staff availability
router.get('/staff', authMiddleware, hospitalController.getStaffAvailability);

// Update staff availability
router.post('/staff/:id/availability', authMiddleware, hospitalController.updateStaffAvailability);

module.exports = router;
