const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/emailService');
const cloudinary = require('../config/cloudinary');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
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
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
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
        // Fallback to local path if Cloudinary fails
        finalImageUrl = req.file.path;
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

module.exports = router; 