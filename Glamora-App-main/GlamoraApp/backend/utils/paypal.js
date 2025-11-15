const fetch = require('node-fetch');

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_ENV = 'sandbox'
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

module.exports = {
  getSubscriptionDetails
};

