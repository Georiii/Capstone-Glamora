const fetch = require('node-fetch');
require('dotenv').config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'ASeg6xvQSeMei_mu4R0oQfib2AeGNL0g_IMiu90RblY0MEy3EbHC5RU0c0a-1Fju7N4P91ydDJrw3diC';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PLAN_ID = process.argv[2]; // Get Plan ID from command line argument

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

async function updatePlan(accessToken, planId) {
  // Option A: Update existing plan (affects new subscriptions only)
  // Note: Existing subscriptions keep their original price
  
  const updateData = [
    {
      op: 'replace',
      path: '/name',
      value: 'Glamora PLUS Monthly'
    },
    {
      op: 'replace',
      path: '/description',
      value: 'Monthly subscription for Glamora PLUS features'
    },
    // Update pricing - affects new subscriptions only
    {
      op: 'replace',
      path: '/billing_cycles/0/pricing_scheme/fixed_price',
      value: {
        value: '120',
        currency_code: 'PHP'
      }
    }
  ];

  // Example: Change status to INACTIVE (uncomment to use)
  // updateData.push({
  //   op: 'replace',
  //   path: '/status',
  //   value: 'INACTIVE'
  // });

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${planId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to update plan (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  if (!PLAN_ID) {
    console.error('❌ Error: Plan ID is required');
    console.log('\nUsage:');
    console.log('  node scripts/update-paypal-plan.js YOUR_PLAN_ID');
    console.log('\nExample:');
    console.log('  node scripts/update-paypal-plan.js P-99D75650V8561931UNEMV6MY');
    process.exit(1);
  }

  try {
    console.log('🔑 Getting PayPal access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');

    console.log(`\n📝 Updating plan: ${PLAN_ID}...`);
    const updatedPlan = await updatePlan(accessToken, PLAN_ID);

    console.log('\n✅ SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Updated Plan Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Plan ID:', updatedPlan.id);
    console.log('Plan Name:', updatedPlan.name);
    console.log('Description:', updatedPlan.description);
    console.log('Status:', updatedPlan.status);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

