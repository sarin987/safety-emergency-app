module.exports = {
  port: process.env.PORT || 5000,
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },
  cors: {
    origin: ['https://safetyemergencyapp.com'],
    credentials: true,
  },
  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
  },
};
