const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initializeDatabase } = require('./config/db');
const authController = require('./controllers/authController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// Auth routes
app.post('/api/auth/register', authController.registerUser);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/profile', authenticateToken, authController.getProfile);
app.put('/api/auth/profile', authenticateToken, authController.updateProfile);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    });
