const db = require('../config/database');
const { io } = require('../socket');
const { calculateDistance, formatEmergencyData } = require('../utils/helpers');

const ambulanceController = {
  // Get all medical emergencies
  async getEmergencies(req, res) {
    try {
      const query = `
        SELECT e.*, u.name as reporter_name, u.phone as reporter_phone,
        l.latitude, l.longitude, l.address,
        m.blood_type, m.allergies, m.conditions
        FROM emergencies e
        JOIN users u ON e.reporter_id = u.id
        JOIN locations l ON e.location_id = l.id
        LEFT JOIN medical_info m ON u.id = m.user_id
        WHERE e.type IN ('medical', 'accident')
        AND e.status != 'resolved'
        ORDER BY e.severity DESC, e.created_at DESC
      `;
      
      const [emergencies] = await db.execute(query);
      res.json(emergencies.map(formatEmergencyData));
    } catch (error) {
      console.error('Error fetching emergencies:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get emergency details
  async getEmergencyDetails(req, res) {
    try {
      const { id } = req.params;
      const query = `
        SELECT e.*, u.name as reporter_name, u.phone as reporter_phone,
        l.latitude, l.longitude, l.address,
        m.blood_type, m.allergies, m.conditions, m.medications,
        GROUP_CONCAT(DISTINCT ev.url) as evidence_urls
        FROM emergencies e
        JOIN users u ON e.reporter_id = u.id
        JOIN locations l ON e.location_id = l.id
        LEFT JOIN medical_info m ON u.id = m.user_id
        LEFT JOIN evidence ev ON e.id = ev.emergency_id
        WHERE e.id = ?
        GROUP BY e.id
      `;
      
      const [[emergency]] = await db.execute(query, [id]);
      if (!emergency) {
        return res.status(404).json({ error: 'Emergency not found' });
      }
      
      res.json(formatEmergencyData(emergency));
    } catch (error) {
      console.error('Error fetching emergency details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update emergency response
  async respondToEmergency(req, res) {
    try {
      const { id } = req.params;
      const { action, notes, eta } = req.body;
      const ambulanceId = req.user.id;

      await db.beginTransaction();

      // Update emergency status
      await db.execute(
        'UPDATE emergencies SET status = ?, responder_id = ?, eta = ?, updated_at = NOW() WHERE id = ?',
        [action === 'accept' ? 'responding' : action === 'resolve' ? 'resolved' : 'pending',
         action === 'accept' ? ambulanceId : null,
         eta,
         id]
      );

      // Log response
      await db.execute(
        'INSERT INTO emergency_logs (emergency_id, responder_id, action, notes) VALUES (?, ?, ?, ?)',
        [id, ambulanceId, action, notes]
      );

      await db.commit();

      // Notify relevant parties
      io.to(`emergency_${id}`).emit('emergencyUpdate', {
        id,
        status: action === 'accept' ? 'responding' : action === 'resolve' ? 'resolved' : 'pending',
        responderId: action === 'accept' ? ambulanceId : null,
        eta
      });

      res.json({ success: true });
    } catch (error) {
      await db.rollback();
      console.error('Error responding to emergency:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ambulance status
  async updateStatus(req, res) {
    try {
      const { status, location } = req.body;
      const ambulanceId = req.user.id;

      await db.execute(
        'UPDATE ambulances SET status = ?, latitude = ?, longitude = ?, updated_at = NOW() WHERE id = ?',
        [status, location.latitude, location.longitude, ambulanceId]
      );

      // Notify dispatch about status change
      io.to('dispatch').emit('ambulanceStatusUpdate', {
        ambulanceId,
        status,
        location
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating ambulance status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ambulance location
  async updateLocation(req, res) {
    try {
      const { latitude, longitude } = req.body;
      const ambulanceId = req.user.id;

      await db.execute(
        'UPDATE ambulances SET latitude = ?, longitude = ?, updated_at = NOW() WHERE id = ?',
        [latitude, longitude, ambulanceId]
      );

      // If ambulance is responding to emergency, update ETA
      const [assignments] = await db.execute(
        'SELECT emergency_id FROM emergency_assignments WHERE ambulance_id = ? AND status = "responding"',
        [ambulanceId]
      );

      if (assignments.length > 0) {
        // Update ETA for each assigned emergency
        for (const assignment of assignments) {
          const [emergency] = await db.execute(
            'SELECT l.latitude, l.longitude FROM emergencies e JOIN locations l ON e.location_id = l.id WHERE e.id = ?',
            [assignment.emergency_id]
          );

          if (emergency) {
            const eta = calculateEta(
              latitude,
              longitude,
              emergency.latitude,
              emergency.longitude
            );

            await db.execute(
              'UPDATE emergencies SET eta = ? WHERE id = ?',
              [eta, assignment.emergency_id]
            );

            // Notify about ETA update
            io.to(`emergency_${assignment.emergency_id}`).emit('etaUpdate', {
              emergencyId: assignment.emergency_id,
              eta
            });
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating ambulance location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get nearest hospitals
  async getNearestHospitals(req, res) {
    try {
      const { latitude, longitude, count = 5 } = req.query;
      
      const query = `
        SELECT h.*, 
        (
          SELECT COUNT(*) 
          FROM hospital_beds hb 
          WHERE hb.hospital_id = h.id AND hb.status = 'available'
        ) as available_beds
        FROM hospitals h
        WHERE h.status = 'active'
      `;

      const [hospitals] = await db.execute(query);
      
      // Calculate distances and sort
      const hospitalsWithDistance = hospitals
        .map(hospital => ({
          ...hospital,
          distance: calculateDistance(
            latitude,
            longitude,
            hospital.latitude,
            hospital.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);

      res.json(hospitalsWithDistance);
    } catch (error) {
      console.error('Error fetching nearest hospitals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update patient status
  async updatePatientStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, vitals, notes } = req.body;
      const ambulanceId = req.user.id;

      await db.beginTransaction();

      // Update patient status
      await db.execute(
        'UPDATE patients SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );

      // Log vitals
      if (vitals) {
        await db.execute(
          'INSERT INTO patient_vitals (patient_id, recorded_by, blood_pressure, heart_rate, temperature, oxygen_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, ambulanceId, vitals.bloodPressure, vitals.heartRate, vitals.temperature, vitals.oxygenLevel, notes]
        );
      }

      await db.commit();

      // Notify hospital about patient status
      io.to(`patient_${id}`).emit('patientStatusUpdate', {
        patientId: id,
        status,
        vitals,
        notes
      });

      res.json({ success: true });
    } catch (error) {
      await db.rollback();
      console.error('Error updating patient status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get patient medical info
  async getPatientMedicalInfo(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT u.name, u.age, u.gender,
        m.blood_type, m.allergies, m.conditions, m.medications,
        GROUP_CONCAT(DISTINCT ph.condition) as medical_history
        FROM users u
        LEFT JOIN medical_info m ON u.id = m.user_id
        LEFT JOIN patient_history ph ON u.id = ph.user_id
        WHERE u.id = ?
        GROUP BY u.id
      `;

      const [[patient]] = await db.execute(query, [id]);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      res.json(patient);
    } catch (error) {
      console.error('Error fetching patient medical info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update ETA to hospital
  async updateEta(req, res) {
    try {
      const { emergencyId, hospitalId, eta } = req.body;
      const ambulanceId = req.user.id;

      await db.execute(
        'UPDATE emergency_assignments SET hospital_id = ?, eta_hospital = ?, updated_at = NOW() WHERE emergency_id = ? AND ambulance_id = ?',
        [hospitalId, eta, emergencyId, ambulanceId]
      );

      // Notify hospital about incoming patient
      io.to(`hospital_${hospitalId}`).emit('incomingPatient', {
        emergencyId,
        ambulanceId,
        eta
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating ETA:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get ambulance statistics
  async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const ambulanceId = req.user.id;
      
      const query = `
        SELECT 
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as completed_missions,
          COUNT(CASE WHEN status = 'responding' THEN 1 END) as active_missions,
          AVG(response_time) as avg_response_time,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) as avg_mission_duration
        FROM emergency_assignments
        WHERE ambulance_id = ?
        AND created_at BETWEEN ? AND ?
      `;

      const [[stats]] = await db.execute(query, [ambulanceId, startDate, endDate]);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching ambulance stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = ambulanceController;
