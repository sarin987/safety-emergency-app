const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const db = require('../config/db');

exports.authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user[0];
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(403).json({ message: 'Invalid token' });
    }
};

exports.authenticateFirebase = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Firebase token required' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Firebase authentication error:', error);
        res.status(403).json({ message: 'Invalid Firebase token' });
    }
};

exports.requireUserType = (userTypes) => {
    return (req, res, next) => {
        if (!req.user || !userTypes.includes(req.user.user_type)) {
            return res.status(403).json({ 
                message: 'Access denied. Required user type: ' + userTypes.join(' or ')
            });
        }
        next();
    };
};
