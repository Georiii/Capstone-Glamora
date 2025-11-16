const fetch = require('node-fetch');

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_ENV = 'sandbox',
  PAYPAL_WEBHOOK_ID
} = process.env;

const PAYPAL_BASE_URL = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials are not configured.');
  }

  const credentials = Buffer
    .from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
    .toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayPal token request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getSubscriptionDetails(subscriptionId) {
  if (!subscriptionId) {
    throw new Error('PayPal subscription ID is required.');
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unable to fetch PayPal subscription (${response.status}): ${body}`);
  }

  return response.json();
}

async function verifyWebhookSignature(rawBody, headers = {}) {
  if (!PAYPAL_WEBHOOK_ID) {
    throw new Error('PAYPAL_WEBHOOK_ID is not configured.');
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'] || headers['PAYPAL-AUTH-ALGO'],
      cert_url: headers['paypal-cert-url'] || headers['PAYPAL-CERT-URL'],
      transmission_id: headers['paypal-transmission-id'] || headers['PAYPAL-TRANSMISSION-ID'],
      transmission_sig: headers['paypal-transmission-sig'] || headers['PAYPAL-TRANSMISSION-SIG'],
      transmission_time: headers['paypal-transmission-time'] || headers['PAYPAL-TRANSMISSION-TIME'],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody)
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to verify PayPal webhook (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}

module.exports = {
  getSubscriptionDetails,
  verifyWebhookSignature
};

