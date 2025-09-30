const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');

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

module.exports = router; 