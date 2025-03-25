const db = require('../config/db');
const { io } = require('../server');
const twilio = require('twilio');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendSOS = async (req, res) => {
    try {
        const { userId, location, timestamp } = req.body;

        // Get user details
        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (!user[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get emergency contacts
        const [contacts] = await db.promise().query(
            'SELECT * FROM emergency_contacts WHERE user_id = ?',
            [userId]
        );

        // Get nearby emergency services
        const [services] = await db.promise().query(
            `SELECT 
                u.id,
                u.full_name,
                u.phone_number,
                u.user_type,
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
            HAVING distance < 5
            ORDER BY distance`,
            [location.latitude, location.longitude, location.latitude]
        );

        // Create SOS record
        const [result] = await db.promise().query(
            `INSERT INTO sos_alerts (user_id, latitude, longitude, status)
             VALUES (?, ?, ?, 'active')`,
            [userId, location.latitude, location.longitude]
        );

        const sosId = result.insertId;

        // Notify emergency services via Socket.IO
        io.emit('sosAlert', {
            id: sosId,
            user: {
                id: user[0].id,
                name: user[0].full_name,
                phone: user[0].phone_number
            },
            location,
            timestamp
        });

        // Send SMS to emergency contacts
        const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        const message = `EMERGENCY: ${user[0].full_name} needs help! Location: ${googleMapsLink}`;

        for (const contact of contacts) {
            try {
                await twilioClient.messages.create({
                    body: message,
                    to: contact.contact_number,
                    from: process.env.TWILIO_PHONE_NUMBER
                });
            } catch (error) {
                console.error('Error sending SMS to contact:', error);
            }
        }

        // Send SMS to nearby emergency services
        for (const service of services) {
            try {
                await twilioClient.messages.create({
                    body: `EMERGENCY: User needs immediate assistance at ${googleMapsLink}`,
                    to: service.phone_number,
                    from: process.env.TWILIO_PHONE_NUMBER
                });
            } catch (error) {
                console.error('Error sending SMS to service:', error);
            }
        }

        res.json({
            success: true,
            message: 'SOS alert sent successfully',
            notifiedContacts: contacts.length,
            notifiedServices: services.length
        });
    } catch (error) {
        console.error('Error sending SOS:', error);
        res.status(500).json({ message: 'Error sending SOS alert' });
    }
};

exports.updateSOSStatus = async (req, res) => {
    try {
        const { sosId, status } = req.body;

        await db.promise().query(
            'UPDATE sos_alerts SET status = ? WHERE id = ?',
            [status, sosId]
        );

        // Notify relevant parties about status update
        io.emit('sosStatusUpdate', {
            sosId,
            status
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating SOS status:', error);
        res.status(500).json({ message: 'Error updating SOS status' });
    }
};
