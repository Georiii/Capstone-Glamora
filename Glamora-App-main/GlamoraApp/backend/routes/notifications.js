const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/database');
const { sendNotificationToUser } = require('../utils/notifications');

const router = express.Router();

// Auth middleware
function auth(req, res, next) {
  // Skip authentication for OPTIONS preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired.'
      : 'Invalid or expired token.';
    return res.status(401).json({ message });
  }
}

// POST /api/notifications/register - Register device token for push notifications
router.post('/register', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Device token is required.' });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ message: 'Valid platform (ios, android, web) is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Initialize notification preferences if not exists
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        messages: true,
        announcements: true,
        subscription: true,
        punishments: true,
        enabled: true
      };
    }

    // Initialize deviceTokens array if not exists
    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }

    // Check if token already exists
    const existingTokenIndex = user.deviceTokens.findIndex(
      dt => dt.token === token && dt.platform === platform
    );

    if (existingTokenIndex >= 0) {
      // Update existing token registration time
      user.deviceTokens[existingTokenIndex].registeredAt = new Date();
    } else {
      // Add new token
      user.deviceTokens.push({
        token,
        platform,
        registeredAt: new Date()
      });
    }

    await user.save();

    res.json({ 
      message: 'Device token registered successfully.',
      tokenCount: user.deviceTokens.length
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ message: 'Failed to register device token.', error: error.message });
  }
});

// GET /api/notifications/preferences - Get user notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('notificationPreferences deviceTokens');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Initialize defaults if not exists
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        messages: true,
        announcements: true,
        subscription: true,
        punishments: true,
        enabled: true
      };
      await user.save();
    }

    res.json({
      preferences: user.notificationPreferences,
      deviceTokensCount: user.deviceTokens ? user.deviceTokens.length : 0
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Failed to fetch notification preferences.', error: error.message });
  }
});

// PUT /api/notifications/preferences - Update user notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { messages, announcements, subscription, punishments, enabled } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Initialize if not exists
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        messages: true,
        announcements: true,
        subscription: true,
        punishments: true,
        enabled: true
      };
    }

    // Update preferences (only update provided fields)
    if (typeof messages === 'boolean') {
      user.notificationPreferences.messages = messages;
    }
    if (typeof announcements === 'boolean') {
      user.notificationPreferences.announcements = announcements;
    }
    if (typeof subscription === 'boolean') {
      user.notificationPreferences.subscription = subscription;
    }
    if (typeof punishments === 'boolean') {
      user.notificationPreferences.punishments = punishments;
    }
    if (typeof enabled === 'boolean') {
      user.notificationPreferences.enabled = enabled;
    }

    await user.save();

    res.json({ 
      message: 'Notification preferences updated successfully.',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Failed to update notification preferences.', error: error.message });
  }
});

// DELETE /api/notifications/unregister - Unregister device token
router.delete('/unregister', auth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Device token is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.deviceTokens || user.deviceTokens.length === 0) {
      return res.json({ message: 'No device tokens to remove.' });
    }

    // Remove token
    user.deviceTokens = user.deviceTokens.filter(dt => dt.token !== token);
    await user.save();

    res.json({ 
      message: 'Device token unregistered successfully.',
      tokenCount: user.deviceTokens.length
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({ message: 'Failed to unregister device token.', error: error.message });
  }
});

// POST /api/notifications/send - Send notification to user (admin/internal use)
router.post('/send', auth, async (req, res) => {
  try {
    const { userId, type, title, body, data } = req.body;

    // Check if user is admin
    const adminUser = await User.findById(req.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can send notifications.' });
    }

    if (!userId || !type || !title || !body) {
      return res.status(400).json({ message: 'userId, type, title, and body are required.' });
    }

    if (!['messages', 'announcements', 'subscription', 'punishments'].includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    const result = await sendNotificationToUser(targetUser, type, title, body, data || {});

    res.json({ 
      message: 'Notification sent.',
      result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Failed to send notification.', error: error.message });
  }
});

module.exports = router;

