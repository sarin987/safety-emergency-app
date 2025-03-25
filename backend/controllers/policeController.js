const db = require('../config/database');
const { io } = require('../socket');
const { calculateDistance, formatEmergencyData } = require('../utils/helpers');

const policeController = {
  // Get all emergencies for police
  async getEmergencies(req, res) {
    try {
      const query = `
        SELECT e.*, u.name as reporter_name, u.phone as reporter_phone,
        l.latitude, l.longitude, l.address
        FROM emergencies e
        JOIN users u ON e.reporter_id = u.id
        JOIN locations l ON e.location_id = l.id
        WHERE e.type IN ('crime', 'accident', 'public_disturbance')
        AND e.status != 'resolved'
        ORDER BY e.created_at DESC
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
        i.description as incident_description, i.severity,
        GROUP_CONCAT(DISTINCT ev.url) as evidence_urls
        FROM emergencies e
        JOIN users u ON e.reporter_id = u.id
        JOIN locations l ON e.location_id = l.id
        LEFT JOIN incidents i ON e.id = i.emergency_id
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

  // Update emergency status
  async respondToEmergency(req, res) {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;
      const officerId = req.user.id;

      await db.beginTransaction();

      // Update emergency status
      await db.execute(
        'UPDATE emergencies SET status = ?, responder_id = ?, updated_at = NOW() WHERE id = ?',
        [action === 'accept' ? 'responding' : action === 'resolve' ? 'resolved' : 'pending', 
         action === 'accept' ? officerId : null, 
         id]
      );

      // Log response
      await db.execute(
        'INSERT INTO emergency_logs (emergency_id, responder_id, action, notes) VALUES (?, ?, ?, ?)',
        [id, officerId, action, notes]
      );

      await db.commit();

      // Notify relevant parties
      io.to(`emergency_${id}`).emit('emergencyUpdate', {
        id,
        status: action === 'accept' ? 'responding' : action === 'resolve' ? 'resolved' : 'pending',
        responderId: action === 'accept' ? officerId : null
      });

      res.json({ success: true });
    } catch (error) {
      await db.rollback();
      console.error('Error responding to emergency:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update patrol status
  async updatePatrolStatus(req, res) {
    try {
      const { status, location } = req.body;
      const officerId = req.user.id;

      await db.execute(
        'UPDATE police_units SET status = ?, latitude = ?, longitude = ?, updated_at = NOW() WHERE officer_id = ?',
        [status, location.latitude, location.longitude, officerId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating patrol status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get nearby units
  async getNearbyUnits(req, res) {
    try {
      const { latitude, longitude, radius = 5 } = req.query; // radius in kilometers
      
      const query = `
        SELECT u.id, u.name, pu.status, pu.latitude, pu.longitude
        FROM police_units pu
        JOIN users u ON pu.officer_id = u.id
        WHERE pu.status = 'active'
      `;

      const [units] = await db.execute(query);
      
      // Filter units within radius
      const nearbyUnits = units.filter(unit => {
        const distance = calculateDistance(
          latitude,
          longitude,
          unit.latitude,
          unit.longitude
        );
        return distance <= radius;
      });

      res.json(nearbyUnits);
    } catch (error) {
      console.error('Error fetching nearby units:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update unit location
  async updateUnitLocation(req, res) {
    try {
      const { latitude, longitude } = req.body;
      const officerId = req.user.id;

      await db.execute(
        'UPDATE police_units SET latitude = ?, longitude = ?, updated_at = NOW() WHERE officer_id = ?',
        [latitude, longitude, officerId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating unit location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get crime statistics
  async getCrimeStats(req, res) {
    try {
      const { startDate, endDate, area } = req.query;
      
      const query = `
        SELECT 
          type,
          COUNT(*) as count,
          DATE_FORMAT(created_at, '%Y-%m-%d') as date
        FROM emergencies
        WHERE type = 'crime'
        AND created_at BETWEEN ? AND ?
        ${area ? 'AND area = ?' : ''}
        GROUP BY type, DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date
      `;

      const params = [startDate, endDate];
      if (area) params.push(area);

      const [stats] = await db.execute(query, params);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching crime stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Report incident
  async reportIncident(req, res) {
    try {
      const {
        emergencyId,
        type,
        description,
        severity,
        evidence,
        location
      } = req.body;
      const officerId = req.user.id;

      await db.beginTransaction();

      // Create incident record
      const [result] = await db.execute(
        'INSERT INTO incidents (emergency_id, officer_id, type, description, severity) VALUES (?, ?, ?, ?, ?)',
        [emergencyId, officerId, type, description, severity]
      );

      // Store evidence if provided
      if (evidence && evidence.length > 0) {
        const evidenceValues = evidence.map(url => [result.insertId, url]);
        await db.execute(
          'INSERT INTO evidence (incident_id, url) VALUES ?',
          [evidenceValues]
        );
      }

      // Update location if provided
      if (location) {
        await db.execute(
          'UPDATE incidents SET latitude = ?, longitude = ? WHERE id = ?',
          [location.latitude, location.longitude, result.insertId]
        );
      }

      await db.commit();
      res.json({ id: result.insertId });
    } catch (error) {
      await db.rollback();
      console.error('Error reporting incident:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get incident history
  async getIncidentHistory(req, res) {
    try {
      const { startDate, endDate, type } = req.query;
      
      const query = `
        SELECT i.*, e.type as emergency_type, u.name as officer_name,
        GROUP_CONCAT(ev.url) as evidence_urls
        FROM incidents i
        JOIN emergencies e ON i.emergency_id = e.id
        JOIN users u ON i.officer_id = u.id
        LEFT JOIN evidence ev ON i.id = ev.incident_id
        WHERE i.created_at BETWEEN ? AND ?
        ${type ? 'AND i.type = ?' : ''}
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;

      const params = [startDate, endDate];
      if (type) params.push(type);

      const [incidents] = await db.execute(query, params);
      res.json(incidents);
    } catch (error) {
      console.error('Error fetching incident history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = policeController;
