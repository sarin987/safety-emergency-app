const db = require('../config/db');
const { io } = require('../server');

exports.startTracking = async (req, res) => {
    try {
        const { userId, location } = req.body;
        
        // Update user's location in database
        await db.promise().query(
            `INSERT INTO locations (user_id, latitude, longitude, is_active)
             VALUES (?, ?, ?, true)`,
            [userId, location.latitude, location.longitude]
        );

        // Broadcast location to relevant subscribers
        io.emit('locationUpdate', {
            userId,
            location,
            type: 'user'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error starting tracking:', error);
        res.status(500).json({ message: 'Error starting location tracking' });
    }
};

exports.stopTracking = async (req, res) => {
    try {
        const { userId } = req.body;

        // Deactivate user's location tracking
        await db.promise().query(
            'UPDATE locations SET is_active = false WHERE user_id = ?',
            [userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error stopping tracking:', error);
        res.status(500).json({ message: 'Error stopping location tracking' });
    }
};

exports.getNearbyServices = async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.query;

        // Get nearby services using Haversine formula
        const [services] = await db.promise().query(
            `SELECT 
                u.id,
                u.full_name as name,
                u.user_type as type,
                l.latitude,
                l.longitude,
                (
                    6371 * acos(
                        cos(radians(?)) * cos(radians(l.latitude)) *
                        cos(radians(l.longitude) - radians(?)) +
                        sin(radians(?)) * sin(radians(l.latitude))
                    )
                ) AS distance
            FROM users u
            JOIN locations l ON u.id = l.user_id
            WHERE u.user_type IN ('police', 'ambulance', 'hospital')
            AND l.is_active = true
            HAVING distance < ?
            ORDER BY distance`,
            [latitude, longitude, latitude, radius / 1000] // Convert radius to km
        );

        // Group services by type
        const groupedServices = services.reduce((acc, service) => {
            const type = service.type + 's'; // pluralize for consistency
            if (!acc[type]) acc[type] = [];
            acc[type].push({
                id: service.id,
                name: service.name,
                location: {
                    latitude: parseFloat(service.latitude),
                    longitude: parseFloat(service.longitude)
                },
                distance: service.distance
            });
            return acc;
        }, { police: [], ambulances: [], hospitals: [] });

        res.json(groupedServices);
    } catch (error) {
        console.error('Error fetching nearby services:', error);
        res.status(500).json({ message: 'Error fetching nearby services' });
    }
};

exports.updateServiceLocation = async (req, res) => {
    try {
        const { userId, location } = req.body;

        // Update service provider's location
        await db.promise().query(
            `UPDATE locations 
             SET latitude = ?, longitude = ?
             WHERE user_id = ? AND is_active = true`,
            [location.latitude, location.longitude, userId]
        );

        // Get service type
        const [user] = await db.promise().query(
            'SELECT user_type FROM users WHERE id = ?',
            [userId]
        );

        if (user[0]) {
            // Broadcast location update to clients
            io.emit('serviceLocationUpdate', {
                id: userId,
                type: user[0].user_type,
                location
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating service location:', error);
        res.status(500).json({ message: 'Error updating service location' });
    }
};
