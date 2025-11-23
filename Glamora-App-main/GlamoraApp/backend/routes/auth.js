const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');
const { sendPasswordResetEmail, sendEmailChangePin, sendRatingFeedbackEmail } = require('../services/emailService');
const cloudinary = require('../config/cloudinary');

// In-memory storage for email change PINs (userId -> { pin, newEmail, expiresAt, lastSentAt })
const emailChangePins = new Map();
const PIN_EXPIRY = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN = 60 * 1000; // 60 seconds

// In-memory daily rate limiting for ratings: userId -> { date: 'YYYY-MM-DD', count: number }
const ratingDailyLimits = new Map();
const RATINGS_PER_DAY_LIMIT = 1;

// Configure multer for file uploads - use memory storage for profile pictures to avoid file system issues
const memoryStorage = multer.memoryStorage();

// Use memory storage for profile picture uploads (better for cloud deployments)
const upload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const router = express.Router();

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
    
    const accountStatus = user.accountStatus || {};
    if (accountStatus.isRestricted) {
      const now = new Date();
      const restrictionEndDate = accountStatus.restrictionEndDate ? new Date(accountStatus.restrictionEndDate) : null;

      if (restrictionEndDate && restrictionEndDate <= now) {
        user.accountStatus = {
          isRestricted: false,
          restrictionReason: null,
          restrictionDuration: null,
          restrictionStartDate: null,
          restrictionEndDate: null,
          restrictedBy: null
        };
        await user.save();
      } else {
        const restrictionDuration = accountStatus.restrictionDuration || 'a limited time';
        let durationLabel = restrictionDuration;
        switch (restrictionDuration) {
          case '1 hour':
            durationLabel = '1 hour';
            break;
          case '1 day':
            durationLabel = '1 day';
            break;
          case '3 days':
            durationLabel = '3 days';
            break;
          case '1 week':
            durationLabel = '1 week';
            break;
          case '1 month':
            durationLabel = '1 month';
            break;
          case 'permanent':
            durationLabel = 'a permanent suspension';
            break;
          default:
            durationLabel = restrictionDuration;
        }

        const reason = accountStatus.restrictionReason || 'unspecified reason';
        const restrictionMessage = `Your account was suspended for ${durationLabel}. Reason of suspension: ${reason}. If you have concern please contact the customer service. Thank you!!`;

        let daysRemaining = null;
        if (restrictionEndDate) {
          daysRemaining = Math.ceil((restrictionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        return res.status(403).json({
          message: 'Account restricted',
          restrictionReason: reason,
          restrictionDuration,
          restrictionEndDate,
          restrictionMessage,
          durationLabel,
          daysRemaining
        });
      }
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
    const { email, bodyMeasurements, stylePreferences, profileSettings } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Ensure profileSettings exists so we can safely mutate measurement metadata or merge new settings
    if (!user.profileSettings) {
      user.profileSettings = {};
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

    // Update profile settings if provided (e.g., allowPersonalizedRecommendations toggle)
    if (profileSettings) {
      user.profileSettings = {
        ...user.profileSettings,
        ...profileSettings,
      };
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
        profileSettings: user.profileSettings,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile.', error: err.message });
  }
});

// Upload profile picture
router.post('/profile/picture', upload.single('image'), async (req, res) => {
  try {
    const { email, imageUrl } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    let finalImageUrl = '';
    let publicId = null;
    
    // Handle file upload (from FormData)
    if (req.file) {
      try {
        // Upload to Cloudinary using buffer (memory storage)
        // Convert buffer to data URI for Cloudinary
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'glamora/profile-pictures',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        });
        finalImageUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        throw new Error('Failed to upload image to Cloudinary: ' + cloudinaryError.message);
      }
    } else if (imageUrl) {
      // Handle direct imageUrl (for base64 or external URLs)
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(imageUrl, {
            folder: 'glamora/profile-pictures',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto' }
            ]
          });
          finalImageUrl = result.secure_url;
          publicId = result.public_id;
        } catch (cloudinaryError) {
          console.error('Cloudinary upload error:', cloudinaryError);
          // If it's already a web URL, use it directly
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            finalImageUrl = imageUrl;
          } else {
            throw new Error('Failed to upload image to Cloudinary');
          }
        }
      } else {
        finalImageUrl = imageUrl;
      }
    } else {
      return res.status(400).json({ message: 'Image file or imageUrl is required.' });
    }
    
    // Update profile picture
    user.profilePicture = {
      url: finalImageUrl,
      publicId: publicId
    };
    
    await user.save();
    
    res.json({ 
      message: 'Profile picture updated successfully.',
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    res.status(500).json({ message: 'Failed to upload profile picture.', error: err.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    // Generate a simple reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token in user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // Send password reset email via Brevo
    try {
      await sendPasswordResetEmail(email, resetToken, user.name);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      // Continue anyway - don't reveal if email sending failed
    }
    
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      resetToken: resetToken // Only for development - remove in production
    });
  } catch (err) {
    console.error('Error processing forgot password:', err);
    res.status(500).json({ message: 'Failed to process password reset request.', error: err.message });
  }
});

// Verify reset token
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token is required.' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.json({ valid: false, message: 'Invalid or expired reset token.' });
    }
    
    res.json({ valid: true, email: user.email });
  } catch (err) {
    console.error('Error verifying reset token:', err);
    res.status(500).json({ valid: false, message: 'Failed to verify token.', error: err.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password.', error: err.message });
  }
});

// Update user by ID
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, profilePicture } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    
    await user.save();
    
    res.json({ 
      message: 'User updated successfully.',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role || 'User',
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user.', error: err.message });
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

// POST /api/auth/request-email-change - Request email change (sends PIN to old email)
router.post('/request-email-change', auth, async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.userId;
    
    // Validate input
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({ message: 'New email is required.' });
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
    
    // Check if new email is different
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({ message: 'New email must be different from current email.' });
    }
    
    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use by another account.' });
    }
    
    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + PIN_EXPIRY;
    
    // Store PIN
    emailChangePins.set(userId.toString(), {
      pin,
      newEmail: newEmail.toLowerCase(),
      expiresAt,
      lastSentAt: Date.now()
    });
    
    // Send PIN to old email
    try {
      await sendEmailChangePin(user.email, pin, user.name || 'User', newEmail);
      console.log(`✅ Email change PIN sent to ${user.email} for new email: ${newEmail}`);
      
      res.status(200).json({ 
        message: 'Verification code sent to your current email address.',
        currentEmail: user.email
      });
    } catch (emailError) {
      console.error('❌ Error sending email change PIN:', emailError);
      emailChangePins.delete(userId.toString());
      return res.status(500).json({ 
        message: 'Failed to send verification code. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (err) {
    console.error('Error requesting email change:', err);
    res.status(500).json({ message: 'Failed to process email change request.', error: err.message });
  }
});

// POST /api/auth/verify-email-change-pin - Verify PIN and update email
router.post('/verify-email-change-pin', auth, async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.userId;
    
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ message: 'Verification code is required.' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Get stored PIN data
    const pinData = emailChangePins.get(userId.toString());
    if (!pinData) {
      return res.status(400).json({ message: 'No verification code found. Please request a new code.' });
    }
    
    // Check if PIN expired
    if (Date.now() > pinData.expiresAt) {
      emailChangePins.delete(userId.toString());
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }
    
    // Verify PIN
    if (pinData.pin !== pin) {
      return res.status(401).json({ message: 'Invalid verification code.' });
    }
    
    // Check if new email is still available
    const existingUser = await User.findOne({ email: pinData.newEmail });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      emailChangePins.delete(userId.toString());
      return res.status(409).json({ message: 'Email already in use by another account.' });
    }
    
    // Store old email for logging
    const oldEmail = user.email;
    
    // Update email
    user.email = pinData.newEmail;
    await user.save();
    
    // Remove PIN data
    emailChangePins.delete(userId.toString());
    
    console.log(`✅ Email updated for user ${user._id}: ${oldEmail} -> ${pinData.newEmail}`);
    
    res.status(200).json({ 
      message: 'Email successfully updated.',
      user: {
        _id: user._id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error verifying email change PIN:', err);
    res.status(500).json({ message: 'Failed to verify verification code.', error: err.message });
  }
});

// POST /api/auth/resend-email-change-pin - Resend PIN with 60s cooldown
router.post('/resend-email-change-pin', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Get existing PIN data
    const existingPinData = emailChangePins.get(userId.toString());
    if (!existingPinData) {
      return res.status(400).json({ message: 'No email change request found. Please request an email change first.' });
    }
    
    // Check cooldown (60 seconds)
    const timeSinceLastSent = Date.now() - existingPinData.lastSentAt;
    if (timeSinceLastSent < RESEND_COOLDOWN) {
      const waitTime = Math.ceil((RESEND_COOLDOWN - timeSinceLastSent) / 1000);
      return res.status(429).json({ 
        message: `Please wait ${waitTime} seconds before requesting a new code.`,
        retryAfter: waitTime
      });
    }
    
    // Generate new 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + PIN_EXPIRY;
    
    // Update PIN data
    emailChangePins.set(userId.toString(), {
      pin,
      newEmail: existingPinData.newEmail,
      expiresAt,
      lastSentAt: Date.now()
    });
    
    // Send PIN to old email
    try {
      await sendEmailChangePin(user.email, pin, user.name || 'User', existingPinData.newEmail);
      console.log(`✅ Email change PIN resent to ${user.email}`);
      
      res.status(200).json({ 
        message: 'Verification code resent to your current email address.',
        currentEmail: user.email
      });
    } catch (emailError) {
      console.error('❌ Error resending email change PIN:', emailError);
      return res.status(500).json({ 
        message: 'Failed to resend verification code. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (err) {
    console.error('Error resending email change PIN:', err);
    res.status(500).json({ message: 'Failed to resend verification code.', error: err.message });
  }
});

// POST /api/auth/feedback/ratings - Submit rating and feedback (rate-limited per day)
router.post('/feedback/ratings', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { stars, feedback, platform, appVersion, deviceModel } = req.body || {};

    const ratingNum = Number(stars);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Stars must be an integer between 1 and 5.' });
    }

    // Enforce per-user daily rate limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const entry = ratingDailyLimits.get(userId) || { date: dateKey, count: 0 };
    if (entry.date !== dateKey) {
      entry.date = dateKey;
      entry.count = 0;
    }
    if (entry.count >= RATINGS_PER_DAY_LIMIT) {
      return res.status(429).json({ message: 'You can submit only one rating per day. Please try again tomorrow.' });
    }

    // Look up user for email context (optional)
    const user = await User.findById(userId).select('email name');
    const userEmail = user?.email || '';

    // Send email to admin
    await sendRatingFeedbackEmail({
      stars: ratingNum,
      feedback: typeof feedback === 'string' ? feedback : '',
      userEmail,
      userId: userId?.toString?.() || '',
      platform: typeof platform === 'string' ? platform : '',
      appVersion: typeof appVersion === 'string' ? appVersion : '',
      deviceModel: typeof deviceModel === 'string' ? deviceModel : '',
      sentTo: 'glamoraapp.customer.service@gmail.com'
    });

    // Update rate limit usage
    entry.count += 1;
    ratingDailyLimits.set(userId, entry);

    return res.status(200).json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Error submitting rating:', err);
    return res.status(500).json({ message: 'Failed to submit rating. Please try again later.' });
  }
});

module.exports = router; 