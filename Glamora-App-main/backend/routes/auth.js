const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');
const { sendEmailChangeConfirmation, sendEmailChangeSuccess } = require('../services/emailService');

const router = express.Router();

// Rate limiting for email change requests (in-memory, resets on server restart)
// In production, use Redis or database for persistence
const emailChangeRateLimit = new Map(); // userId -> { lastRequest: timestamp, count: number }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 1;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, passwordHash });
    await user.save();
    res.status(201).json({ message: 'User registered successfully.', user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password required.' });
    }
    
    console.log('Looking for user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    console.log('User found, checking password');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    console.log('Password valid, generating token');
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Login successful for user:', user.email);
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// Get user by email
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({ user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Failed to fetch user.', error: err.message });
  }
});

// Update user body measurements and style preferences
router.put('/profile/measurements', async (req, res) => {
  try {
    const { email, bodyMeasurements, stylePreferences } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Update body measurements if provided
    if (bodyMeasurements) {
      user.bodyMeasurements = { ...user.bodyMeasurements, ...bodyMeasurements };
      user.profileSettings.measurementLastUpdated = new Date();
    }
    
    // Update style preferences if provided
    if (stylePreferences) {
      user.stylePreferences = { ...user.stylePreferences, ...stylePreferences };
    }
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully.', 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bodyMeasurements: user.bodyMeasurements,
        stylePreferences: user.stylePreferences,
        profileSettings: user.profileSettings
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
});

// Get user profile with measurements
router.get('/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bodyMeasurements: user.bodyMeasurements,
        stylePreferences: user.stylePreferences,
        profileSettings: user.profileSettings
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile.', error: err.message });
  }
});

// Auth middleware for protected routes
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided.' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Invalid token format.' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    return res.status(401).json({ message: 'Authentication failed.' });
  }
};

// POST /api/auth/request-email-change - Request email change (sends confirmation email)
router.post('/request-email-change', auth, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const userId = req.userId;
    
    // Validate input
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({ message: 'New email is required.' });
    }
    
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ message: 'Current password is required to change email.' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Verify current password before allowing email change
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    
    // Check if new email is different
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({ message: 'New email must be different from current email.' });
    }
    
    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use by another account.' });
    }
    
    // Rate limiting check
    const rateLimitKey = userId.toString();
    const now = Date.now();
    const userRateLimit = emailChangeRateLimit.get(rateLimitKey);
    
    if (userRateLimit) {
      const timeSinceLastRequest = now - userRateLimit.lastRequest;
      if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
        const waitTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000);
        return res.status(429).json({ 
          message: `Please wait ${waitTime} seconds before requesting another email change.`,
          retryAfter: waitTime
        });
      }
    }
    
    // Update rate limit
    emailChangeRateLimit.set(rateLimitKey, {
      lastRequest: now,
      count: (userRateLimit?.count || 0) + 1
    });
    
    // Generate JWT token for email confirmation
    const emailChangeToken = jwt.sign(
      { 
        userId: user._id.toString(),
        newEmail: newEmail.toLowerCase(),
        type: 'email-change'
      },
      JWT_SECRET,
      { expiresIn: '15m' } // 15 minutes expiration
    );
    
    // Send confirmation email to current email address
    try {
      await sendEmailChangeConfirmation(user, newEmail, emailChangeToken);
      console.log(`✅ Email change confirmation sent to ${user.email} for new email: ${newEmail}`);
      
      res.status(200).json({ 
        message: 'Confirmation email sent to your current email address. Please check your inbox and click the confirmation link.',
        currentEmail: user.email
      });
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
      // Remove rate limit entry on error
      emailChangeRateLimit.delete(rateLimitKey);
      return res.status(500).json({ 
        message: 'Failed to send confirmation email. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (err) {
    console.error('Error requesting email change:', err);
    res.status(500).json({ message: 'Failed to process email change request.', error: err.message });
  }
});

// GET /api/auth/confirm-email-change - Confirm email change via token
router.get('/confirm-email-change', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'This confirmation link has expired. Please request a new email change.' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(400).json({ message: 'Invalid confirmation token.' });
      }
      throw jwtError;
    }
    
    // Validate token type
    if (decoded.type !== 'email-change') {
      return res.status(400).json({ message: 'Invalid token type.' });
    }
    
    const { userId, newEmail } = decoded;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Check if new email is already in use by another account
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.status(409).json({ message: 'Email already in use by another account.' });
    }
    
    // Store old email for success notification
    const oldEmail = user.email;
    
    // Update email
    user.email = newEmail.toLowerCase();
    await user.save();
    
    console.log(`✅ Email updated for user ${user._id}: ${oldEmail} -> ${newEmail}`);
    
    // Send success notification to new email
    try {
      await sendEmailChangeSuccess(user, oldEmail);
      console.log(`✅ Email change success notification sent to ${newEmail}`);
    } catch (emailError) {
      console.error('⚠️ Email updated but failed to send success notification:', emailError);
      // Don't fail the request if success email fails
    }
    
    // Return success response
    res.status(200).json({ 
      message: 'Email successfully updated.',
      user: {
        _id: user._id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error confirming email change:', err);
    res.status(500).json({ message: 'Failed to confirm email change.', error: err.message });
  }
});

// PUT /api/auth/change-password - Change user password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.passwordHash = newPasswordHash;
    await user.save();
    
    console.log(`✅ Password changed for user ${user._id}`);
    
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Failed to change password.', error: err.message });
  }
});

module.exports = router; 