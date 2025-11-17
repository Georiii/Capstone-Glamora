const fetch = require('node-fetch');
require('dotenv').config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'ASeg6xvQSeMei_mu4R0oQfib2AeGNL0g_IMiu90RblY0MEy3EbHC5RU0c0a-1Fju7N4P91ydDJrw3diC';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';

const PAYPAL_BASE_URL = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials are not configured. Please set PAYPAL_CLIENT_SECRET in your .env file.');
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

async function createProduct(accessToken) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: 'Glamora PLUS',
      description: 'Glamora PLUS Subscription',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://example.com/glamora-logo.png',
      home_url: 'https://example.com'
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create product (${response.status}): ${body}`);
  }

  const data = await response.json();
  console.log('✅ Product created:', data.id);
  return data.id;
}

async function createPlan(accessToken, productId) {
  const planData = {
    product_id: productId,
    name: 'Glamora PLUS Monthly',
    description: 'Monthly subscription for Glamora PLUS features',
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: {
          interval_unit: 'MONTH',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 means infinite
        pricing_scheme: {
          fixed_price: {
            value: '9.99',
            currency_code: 'USD'
          }
        }
      }
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: '0',
        currency_code: 'USD'
      },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3
    }
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(planData)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create plan (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  try {
    console.log('🔑 Getting PayPal access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    console.log('\n📦 Creating PayPal product...');
    const productId = await createProduct(accessToken);

    console.log('\n💳 Creating subscription plan...');
    const plan = await createPlan(accessToken, productId);

    console.log('\n✅ SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Plan Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Plan ID:', plan.id);
    console.log('Plan Name:', plan.name);
    console.log('Status:', plan.status);
    console.log('Product ID:', plan.product_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Update your configuration with:');
    console.log(`EXPO_PUBLIC_PAYPAL_PLAN_ID=${plan.id}`);
    console.log('\nUpdate this in:');
    console.log('1. eas.json (all build profiles)');
    console.log('2. .env file (if you have one)');
    console.log('3. Any other config files');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

