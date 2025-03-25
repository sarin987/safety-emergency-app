# Safety Emergency App

A React Native mobile application with Node.js backend for emergency response and safety services.

## Project Structure

```
safety-emergency-app/
├── backend/               # Node.js + Express backend
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── services/        # Business logic
└── mobile/              # React Native mobile app
    └── SafetyEmergencyApp/
        ├── src/
        │   ├── components/   # Reusable components
        │   ├── screens/     # Screen components
        │   ├── services/    # API and services
        │   └── navigation/  # Navigation setup
        └── assets/         # Images and fonts
```

## Prerequisites

- Node.js >= 14
- npm or yarn
- MySQL
- React Native development environment
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/safety-emergency-app.git
   cd safety-emergency-app
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm start
   ```

3. Set up the mobile app:
   ```bash
   cd mobile/SafetyEmergencyApp
   npm install
   npx expo start
   ```

## Environment Variables

### Backend (.env)
```
PORT=5000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=safety_emergency_db
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### Mobile App (.env)
```
API_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
```

## Features

- User authentication (login/register)
- Emergency alert system
- Real-time location tracking
- Chat with emergency services
- Map view of nearby emergency services
- Profile management
- Push notifications

## Running the App

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the mobile app:
   ```bash
   cd mobile/SafetyEmergencyApp
   npx expo start
   ```

3. Use the Expo Go app to run on your device:
   - Scan the QR code with your camera (iOS)
   - Scan the QR code with Expo Go (Android)

## Development

- Backend runs on: http://localhost:5000
- API documentation: http://localhost:5000/api-docs
- WebSocket server: ws://localhost:5000

## Testing

```bash
# Backend tests
cd backend
npm test

# Mobile app tests
cd mobile/SafetyEmergencyApp
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
