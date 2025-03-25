const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || '139.59.40.236',
    user: process.env.DB_USER || 'sarin_raj',
    password: process.env.DB_PASSWORD || 'C4uqtbqvx2#',
    database: process.env.DB_NAME || 'safety_emergency_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Function to initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Drop existing tables in correct order (child tables first)
        await connection.query('DROP TABLE IF EXISTS location_history');
        await connection.query('DROP TABLE IF EXISTS notifications');
        await connection.query('DROP TABLE IF EXISTS chat_messages');
        await connection.query('DROP TABLE IF EXISTS emergency_responses');
        await connection.query('DROP TABLE IF EXISTS emergency_events');
        await connection.query('DROP TABLE IF EXISTS emergency_alerts');
        await connection.query('DROP TABLE IF EXISTS emergency_contacts');
        await connection.query('DROP TABLE IF EXISTS users');

        // Create users table
        await connection.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        // Create emergency_contacts table
        await connection.query(`
            CREATE TABLE emergency_contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                relationship VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create emergency_alerts table
        await connection.query(`
            CREATE TABLE emergency_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                status ENUM('active', 'resolved', 'false_alarm') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create emergency_events table
        await connection.query(`
            CREATE TABLE emergency_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                event_type ENUM('medical', 'fire', 'police', 'other') NOT NULL,
                description TEXT,
                status ENUM('active', 'resolved', 'false_alarm') DEFAULT 'active',
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create emergency_responses table
        await connection.query(`
            CREATE TABLE emergency_responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                responder_id INT NOT NULL,
                response_type ENUM('accepted', 'rejected', 'arrived', 'completed') NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES emergency_events(id) ON DELETE CASCADE,
                FOREIGN KEY (responder_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create chat_messages table
        await connection.query(`
            CREATE TABLE chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES emergency_events(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create notifications table
        await connection.query(`
            CREATE TABLE notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('alert', 'event', 'response', 'chat', 'system') NOT NULL,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create location_history table
        await connection.query(`
            CREATE TABLE location_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                accuracy FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        connection.release();
        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initializeDatabase
};
