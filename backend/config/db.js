const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '139.59.40.236',
    user: process.env.DB_USER || 'sarin_raj',
    password: process.env.DB_PASSWORD || 'C4uqtbqvx2#',
    database: process.env.DB_NAME || 'safety_emergency_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
