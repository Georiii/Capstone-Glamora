const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');

// Auth middleware
function auth(req, res, next) {
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
}

// GET /api/subscription/status - Check user subscription status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isSubscribed = user.subscription?.isSubscribed || false;
    const subscriptionType = user.subscription?.subscriptionType || 'free';
    
    // Check if subscription has expired
    let activeSubscription = isSubscribed;
    if (isSubscribed && user.subscription?.expiresAt) {
      if (new Date() > new Date(user.subscription.expiresAt)) {
        activeSubscription = false;
        // Auto-expire subscription
        user.subscription.isSubscribed = false;
        user.subscription.subscriptionType = 'free';
        await user.save();
      }
    }

    res.json({
      isSubscribed: activeSubscription,
      subscriptionType: activeSubscription ? subscriptionType : 'free',
      subscribedAt: user.subscription?.subscribedAt,
      expiresAt: user.subscription?.expiresAt,
      dailyOutfitSuggestionsCount: user.subscription?.dailyOutfitSuggestionsCount || 0,
      lastOutfitSuggestionDate: user.subscription?.lastOutfitSuggestionDate
    });
  } catch (err) {
    console.error('Error checking subscription status:', err);
    res.status(500).json({ message: 'Failed to check subscription status.', error: err.message });
  }
});

// POST /api/subscription/subscribe - Subscribe to Glamora PLUS
router.post('/subscribe', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Set subscription to active
    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1); // 1 year subscription

    if (!user.subscription) {
      user.subscription = {
        isSubscribed: true,
        subscriptionType: 'plus',
        subscribedAt: now,
        expiresAt: oneYearFromNow,
        dailyOutfitSuggestionsCount: 0,
        lastOutfitSuggestionDate: null
      };
    } else {
      user.subscription.isSubscribed = true;
      user.subscription.subscriptionType = 'plus';
      user.subscription.subscribedAt = now;
      user.subscription.expiresAt = oneYearFromNow;
    }

    await user.save();

    console.log(`✅ User ${user._id} subscribed to Glamora PLUS`);

    res.json({
      message: 'Successfully subscribed to Glamora PLUS!',
      subscription: {
        isSubscribed: true,
        subscriptionType: 'plus',
        subscribedAt: user.subscription.subscribedAt,
        expiresAt: user.subscription.expiresAt
      }
    });
  } catch (err) {
    console.error('Error subscribing user:', err);
    res.status(500).json({ message: 'Failed to subscribe.', error: err.message });
  }
});

module.exports = router;

