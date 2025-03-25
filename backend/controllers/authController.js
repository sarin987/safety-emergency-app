const admin = require('firebase-admin');
const twilio = require('twilio');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.registerUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, gender, userType = 'normal' } = req.body;
        const profilePicUrl = req.file ? req.file.path : null;

        // Check if user already exists
        const [existingUser] = await db.promise().query(
            'SELECT * FROM users WHERE email = ? OR phone_number = ?',
            [email, phoneNumber]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // For normal users, create Firebase account
        if (userType === 'normal') {
            try {
                await admin.auth().createUser({
                    email,
                    phoneNumber: `+${phoneNumber}`,
                    displayName: fullName
                });
            } catch (firebaseError) {
                console.error('Firebase user creation error:', firebaseError);
                return res.status(500).json({ message: 'Error creating user in Firebase' });
            }
        }

        // Generate OTP for phone verification
        const otp = generateOTP();
        const verificationSession = jwt.sign(
            { phoneNumber, otp },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Insert user into database
        const [result] = await db.promise().query(
            `INSERT INTO users (full_name, email, phone_number, gender, profile_pic_url, user_type, verification_session)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [fullName, email, phoneNumber, gender, profilePicUrl, userType, verificationSession]
        );

        // Send OTP via Twilio for normal users
        if (userType === 'normal') {
            try {
                await twilioClient.messages.create({
                    body: `Your verification code is: ${otp}`,
                    to: `+${phoneNumber}`,
                    from: process.env.TWILIO_PHONE_NUMBER
                });
            } catch (twilioError) {
                console.error('Twilio error:', twilioError);
                // Don't return error, as user is already created
            }
        }

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            verificationRequired: userType === 'normal'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};

exports.verifyPhone = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const [user] = await db.promise().query(
            'SELECT verification_session FROM users WHERE id = ?',
            [userId]
        );

        if (!user[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verificationData = jwt.verify(user[0].verification_session, process.env.JWT_SECRET);
        
        if (verificationData.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        await db.promise().query(
            'UPDATE users SET user_verified = 1, verification_session = NULL WHERE id = ?',
            [userId]
        );

        res.json({ message: 'Phone number verified successfully' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Error verifying phone number' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, phoneNumber, userType } = req.body;

        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND user_type = ?',
            [email || '', phoneNumber || '', userType]
        );

        if (!user[0]) {
            return res.status(404).json({ message: 'User not found' });
        }

        // For normal users, check verification status
        if (userType === 'normal' && !user[0].user_verified) {
            return res.status(403).json({ message: 'Phone number not verified' });
        }

        // For service providers (police, ambulance, hospital), verify credentials
        if (userType !== 'normal') {
            // Here you would implement specific verification logic for service providers
            // This could involve checking against a whitelist, verifying ID numbers, etc.
        }

        const token = jwt.sign(
            { userId: user[0].id, userType },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user[0].id,
                fullName: user[0].full_name,
                email: user[0].email,
                phoneNumber: user[0].phone_number,
                userType: user[0].user_type,
                profilePicUrl: user[0].profile_pic_url
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
};
