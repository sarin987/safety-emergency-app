# Safety Emergency Response App

A mobile application for emergency response and safety services, connecting users with police, ambulance, and hospital services.

## Features

- User registration and authentication with phone verification
- Real-time location tracking and sharing
- Emergency SOS alerts
- Chat and media sharing with emergency services
- Nearby emergency services locator
- Different dashboards for various user types (Normal Users, Police, Ambulance, Hospital)

## Tech Stack

- Frontend: React Native
- Backend: Node.js + Express
- Database: MySQL
- Authentication: Firebase
- Real-time Communication: Socket.IO
- Maps: Google Maps

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with the following variables:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=safety_emergency_db
   FIREBASE_CONFIG=your_firebase_config
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS, install pods:
   ```bash
   cd ios && pod install && cd ..
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Run on specific platform:
   ```bash
   npm run android
   # or
   npm run ios
   ```

## Required API Keys

- Google Maps API Key
- Firebase Configuration
- Twilio Account (for OTP verification)

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
