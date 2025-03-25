require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
const cronService = require('./services/cronService');
const dbMonitor = require('./services/dbMonitorService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'safety_emergency_db'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create tables if they don't exist
  const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(20) UNIQUE NOT NULL,
      gender VARCHAR(10),
      profile_pic_url TEXT,
      user_type ENUM('normal', 'ambulance', 'hospital', 'police') NOT NULL,
      verification_session TEXT,
      reset_session TEXT,
      user_verified BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      contact_name VARCHAR(255) NOT NULL,
      contact_number VARCHAR(20) NOT NULL,
      relationship VARCHAR(50),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message_type ENUM('text', 'image', 'video') NOT NULL,
      content TEXT,
      media_url TEXT,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user1_id INT NOT NULL,
      user2_id INT NOT NULL,
      last_message_id INT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id),
      FOREIGN KEY (last_message_id) REFERENCES messages(id),
      UNIQUE KEY unique_conversation (user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS user_devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      device_token VARCHAR(255) NOT NULL,
      device_type ENUM('ios', 'android') NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `;

  db.query(createTables, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
      return;
    }
    console.log('Database tables created/verified');
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, receiverId, messageType, content, mediaUrl } = data;
      
      // Insert message into database
      const [result] = await db.promise().query(
        `INSERT INTO messages (sender_id, receiver_id, message_type, content, media_url)
         VALUES (?, ?, ?, ?, ?)`,
        [senderId, receiverId, messageType, content, mediaUrl]
      );

      // Update or create conversation
      await db.promise().query(
        `INSERT INTO conversations (user1_id, user2_id, last_message_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE last_message_id = ?`,
        [Math.min(senderId, receiverId), Math.max(senderId, receiverId), result.insertId, result.insertId]
      );

      // Emit message to both sender and receiver
      socket.to(`user_${receiverId}`).emit('newMessage', {
        ...data,
        id: result.insertId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes will be imported here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/services', require('./routes/services'));

// Database monitoring endpoints
app.get('/api/admin/db/metrics', async (req, res) => {
    try {
        const metrics = dbMonitor.getMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/db/backup', async (req, res) => {
    try {
        const backup = await dbMonitor.backup();
        res.json(backup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/db/restore', async (req, res) => {
    try {
        const result = await dbMonitor.restore(req.body.backupFile);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/db/optimize', async (req, res) => {
    try {
        const result = await dbMonitor.optimize();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/db/table-sizes', async (req, res) => {
    try {
        const sizes = await dbMonitor.getTableSizes();
        res.json(sizes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        // Start database monitoring
        await cronService.startMonitoring();
        console.log('Database monitoring started');
    } catch (error) {
        console.error('Failed to start database monitoring:', error);
    }
});
