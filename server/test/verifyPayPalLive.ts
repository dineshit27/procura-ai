import { getPayPalAccessToken, createPayPalOrder, clearPayPalTokenCache } from '../src/services/paypalService.js';
import { env } from '../src/config/env.js';

async function main() {
  console.log('--- Testing PayPal Live Sandbox Integration ---');
  console.log('Base URL:', env.PAYPAL_BASE_URL);
  console.log('Payee Email:', env.PAYPAL_PAYEE_EMAIL);
  console.log('Client ID configured:', Boolean(env.PAYPAL_CLIENT_ID));
  console.log('Client Secret configured:', Boolean(env.PAYPAL_CLIENT_SECRET));

  clearPayPalTokenCache();

  try {
    console.log('\n[1] Requesting OAuth2 Access Token from PayPal Sandbox...');
    const token = await getPayPalAccessToken();
    console.log('OAuth2 Access Token acquired successfully! Length:', token.length, 'Prefix:', token.slice(0, 10) + '...');

    console.log('\n[2] Creating Live Test Order in PayPal Sandbox...');
    const testOrder = await createPayPalOrder({
      total: 15.50,
      currency: 'USD',
      referenceId: 'REQ-LIVE-VERIFY-001',
      description: 'Procura AI Live Sandbox Verification Item',
      items: [
        {
          name: 'Verification Item',
          unitAmount: 15.50,
          quantity: 1,
          currency: 'USD',
        },
      ],
    });

    console.log('Order created successfully!');
    console.log('Order ID:', testOrder.orderId);
    console.log('Status:', testOrder.status);
    console.log('Approve Link:', testOrder.approvalUrl);

    console.log('\n[3] PayPal Live Sandbox Verification Status: PASS');
  } catch (err: unknown) {
    console.error('PayPal Live Sandbox Verification Error:', err instanceof Error ? err.message : err);
  }
}

main();
