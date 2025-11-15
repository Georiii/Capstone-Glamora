const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/database');
const { getSubscriptionDetails } = require('../utils/paypal');

const router = express.Router();

function auth(req, res, next) {
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

function normalizeSubscription(user) {
  if (!user.subscription) {
    user.subscription = {
      isSubscribed: false,
      subscriptionType: 'free'
    };
    return;
  }

  const { isSubscribed, expiresAt } = user.subscription;
  if (isSubscribed && expiresAt && new Date(expiresAt) < new Date()) {
    user.subscription.isSubscribed = false;
    user.subscription.subscriptionType = 'free';
  }
}

router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    normalizeSubscription(user);
    await user.save();

    res.json({
      isSubscribed: user.subscription?.isSubscribed || false,
      subscriptionType: user.subscription?.subscriptionType || 'free',
      subscribedAt: user.subscription?.subscribedAt,
      expiresAt: user.subscription?.expiresAt,
      dailyOutfitSuggestionsCount: user.subscription?.dailyOutfitSuggestionsCount || 0,
      lastOutfitSuggestionDate: user.subscription?.lastOutfitSuggestionDate,
      paypalSubscriptionId: user.subscription?.paypalSubscriptionId,
      paypalStatus: user.subscription?.paypalStatus
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ message: 'Failed to check subscription status.', error: error.message });
  }
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { paypalSubscriptionId } = req.body;
    if (!paypalSubscriptionId) {
      return res.status(400).json({ message: 'paypalSubscriptionId is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const subscriptionDetails = await getSubscriptionDetails(paypalSubscriptionId);
    const status = subscriptionDetails.status;
    if (!['ACTIVE', 'APPROVED'].includes(status)) {
      return res.status(400).json({ message: `PayPal subscription is not active (status: ${status}).` });
    }

    const now = new Date();
    const startTime = subscriptionDetails.start_time ? new Date(subscriptionDetails.start_time) : now;
    const nextBillingTime = subscriptionDetails.billing_info?.next_billing_time
      ? new Date(subscriptionDetails.billing_info.next_billing_time)
      : null;

    const expiresAt = nextBillingTime || new Date(startTime.getTime());
    if (!nextBillingTime) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    user.subscription = {
      ...(user.subscription || {}),
      isSubscribed: true,
      subscriptionType: 'plus',
      subscribedAt: startTime,
      expiresAt,
      dailyOutfitSuggestionsCount: 0,
      lastOutfitSuggestionDate: null,
      paypalSubscriptionId,
      paypalPlanId: subscriptionDetails.plan_id,
      paypalStatus: status
    };

    await user.save();

    res.json({
      message: 'Subscription activated via PayPal.',
      subscription: {
        isSubscribed: user.subscription.isSubscribed,
        subscriptionType: user.subscription.subscriptionType,
        subscribedAt: user.subscription.subscribedAt,
        expiresAt: user.subscription.expiresAt,
        paypalSubscriptionId: user.subscription.paypalSubscriptionId,
        paypalPlanId: user.subscription.paypalPlanId,
        paypalStatus: user.subscription.paypalStatus
      }
    });
  } catch (error) {
    console.error('Error subscribing via PayPal:', error);
    res.status(500).json({ message: 'Failed to activate subscription.', error: error.message });
  }
});

module.exports = router;

