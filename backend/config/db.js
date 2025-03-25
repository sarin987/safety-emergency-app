const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '139.59.40.236',
  user: process.env.DB_USER || 'sarin_raj',
  password: process.env.DB_PASSWORD || 'C4uqtbqvx2#',
    database: process.env.DB_NAME || 'safety_emergency_db',
    waitForConnections: true,
    connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Function to initialize database
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Drop existing tables if they exist (for clean initialization)
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
