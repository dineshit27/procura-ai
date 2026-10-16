import { env } from '../src/config/env.js';
import { createPayPalOrder, getPayPalAccessToken } from '../src/services/paypalService.js';

const BASE_URL = 'http://localhost:5000';

async function main() {
  console.log('====================================================');
  console.log(' Procura AI — Runtime Data Source Audit Runner');
  console.log('====================================================\n');

  // 1. Verify Gemini Endpoint & Provider
  console.log('--- 1. Testing AI Procurement Analysis (/api/ai/analyze-purchase) ---');
  try {
    const aiRes = await fetch(`${BASE_URL}/api/ai/analyze-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Ergonomic high-back mesh chair for software developer with lumbar support',
        budget: 1200,
        quantity: 1,
        category: 'Office Ergonomics',
      }),
    });
    const aiJson = await aiRes.json() as any;
    console.log('HTTP Status:', aiRes.status);
    console.log('Status Field:', aiJson.status);
    console.log('Provider:', aiJson.data?.provider);
    console.log('Model:', aiJson.data?.model);
    console.log('Summary:', aiJson.data?.summary);
    console.log('Options returned:', aiJson.data?.options?.length);
    if (aiJson.data?.options?.[0]) {
      console.log('Top Option ID:', aiJson.data.options[0].catalogItem?.id);
      console.log('Top Option Name:', aiJson.data.options[0].catalogItem?.name);
      console.log('Match Score:', aiJson.data.options[0].matchScore);
    }
  } catch (err) {
    console.error('AI check failed:', err);
  }

  // 2. Verify PayPal Sandbox Configuration & Order Creation
  console.log('\n--- 2. Testing PayPal Sandbox Integration ---');
  try {
    const configRes = await fetch(`${BASE_URL}/api/checkout/config`);
    const config = await configRes.json() as any;
    console.log('Checkout Config Endpoint Status:', configRes.status);
    console.log('PayPal Enabled:', config.enabled);
    console.log('PayPal Client ID Configured:', Boolean(config.clientId));
    console.log('Client ID (redacted):', config.clientId ? config.clientId.slice(0, 8) + '...' : 'none');
    console.log('Base URL:', config.baseUrl);
    console.log('Is Sandbox:', config.isSandbox);
    console.log('Payee Email (redacted):', config.payeeEmail ? config.payeeEmail.replace(/(.{3})(.*)(@.*)/, '$1***$3') : 'none');

    // Create an order through the backend checkout route on an existing approved request
    console.log('\nTesting Live Order Creation on Approved Request (REQ-2026-081)...');
    const orderRes = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
    });
    const orderJson = await orderRes.json() as any;
    console.log('Order Creation HTTP Status:', orderRes.status);
    if (orderRes.ok) {
      console.log('Created Order ID:', orderJson.orderId);
      console.log('Order Status:', orderJson.status);
      console.log('Authoritative Total:', orderJson.amount?.total, orderJson.amount?.currency);
    } else {
      console.log('Response Error:', orderJson.error);
      console.log('Response Message:', orderJson.message);
      if (orderJson.orderId) console.log('Existing Order ID:', orderJson.orderId);
    }
  } catch (err) {
    console.error('PayPal check failed:', err);
  }

  // 3. Inspect SpendGuard Summary vs Requests Consistency
  console.log('\n--- 3. Checking Dashboard Consistency (/api/spendguard/summary vs /api/requests) ---');
  try {
    const [summaryRes, requestsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/spendguard/summary`),
      fetch(`${BASE_URL}/api/requests`),
    ]);

    const summary = (await summaryRes.json() as any).data;
    const requests = (await requestsRes.json() as any).data as any[];

    console.log('Authoritative SpendGuard Summary:');
    console.log('  Configured Budget:', summary.configuredBudget);
    console.log('  Paid Spending:', summary.paidSpending);
    console.log('  Reserved Spending:', summary.reservedSpending);
    console.log('  Total Committed:', summary.totalCommitted);
    console.log('  Remaining Budget:', summary.remainingBudget);
    console.log('  Utilization %:', summary.utilizationPercent);
    console.log('  Pending Approvals Count:', summary.pendingApprovalCount, 'Total: $' + summary.pendingApprovalTotal);
    console.log('  Blocked Requests Count:', summary.blockedRequestsCount);
    console.log('  Alerts Count:', summary.alerts?.length);
    console.log('  Recent Activity in Summary:', summary.recentActivity?.length, 'items');

    // Calculate directly from requests array
    const actualPaid = requests.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.authoritativeTotal || r.estimatedTotal || 0), 0);
    const actualReserved = requests.filter((r) => r.status === 'approved').reduce((s, r) => s + (r.authoritativeTotal || r.estimatedTotal || 0), 0);
    const actualPending = requests.filter((r) => r.status === 'pending_approval').reduce((s, r) => s + (r.authoritativeTotal || r.estimatedTotal || 0), 0);

    console.log('\nDirect Calculation from /api/requests:');
    console.log('  Total Records in Backend:', requests.length);
    console.log('  Calculated Paid:', actualPaid);
    console.log('  Calculated Reserved:', actualReserved);
    console.log('  Calculated Pending:', actualPending);

    console.log('\nDiscrepancies / Checks:');
    console.log('  Paid match:', summary.paidSpending === actualPaid ? 'MATCH' : `MISMATCH (summary: ${summary.paidSpending}, actual: ${actualPaid})`);
    console.log('  Reserved match:', summary.reservedSpending === actualReserved ? 'MATCH' : `MISMATCH (summary: ${summary.reservedSpending}, actual: ${actualReserved})`);
    console.log('  Pending match:', summary.pendingApprovalTotal === actualPending ? 'MATCH' : `MISMATCH (summary: ${summary.pendingApprovalTotal}, actual: ${actualPending})`);

  } catch (err) {
    console.error('Consistency check failed:', err);
  }
}

main();
