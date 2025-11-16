const express = require('express');
const User = require('../models/User');
const { verifyWebhookSignature } = require('../utils/paypal');

const router = express.Router();

function getSubscriptionId(event) {
  return event?.resource?.id || event?.resource?.subscription_id || event?.resource?.billing_agreement_id;
}

async function updateUserSubscription(subscriptionId, updater) {
  if (!subscriptionId) {
    return;
  }

  const user = await User.findOne({ 'subscription.paypalSubscriptionId': subscriptionId });
  if (!user) {
    console.warn(`⚠️ PayPal webhook: user not found for subscription ${subscriptionId}`);
    return;
  }

  await updater(user);
  await user.save();
}

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = req.body?.toString('utf8') || '';
    if (!rawBody) {
      return res.status(400).json({ message: 'Empty webhook payload.' });
    }

    const isValid = await verifyWebhookSignature(rawBody, req.headers);
    if (!isValid) {
      console.warn('⚠️ PayPal webhook signature verification failed.');
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody);
    const subscriptionId = getSubscriptionId(event);

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await updateUserSubscription(subscriptionId, async (user) => {
          user.subscription = {
            ...(user.subscription || {}),
            isSubscribed: true,
            subscriptionType: 'plus',
            subscribedAt: user.subscription?.subscribedAt || new Date(event.resource?.start_time || Date.now()),
            expiresAt: event.resource?.billing_info?.next_billing_time
              ? new Date(event.resource.billing_info.next_billing_time)
              : user.subscription?.expiresAt || null,
            paypalStatus: event.resource?.status || event.event_type
          };
        });
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await updateUserSubscription(subscriptionId, async (user) => {
          user.subscription = {
            ...(user.subscription || {}),
            isSubscribed: false,
            subscriptionType: 'free',
            paypalStatus: event.resource?.status || event.event_type
          };
        });
        break;
      default:
        console.log(`ℹ️ PayPal webhook received unhandled event: ${event.event_type}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ PayPal webhook error:', error);
    res.status(500).json({ message: 'Failed to process webhook.', error: error.message });
  }
});

module.exports = router;

