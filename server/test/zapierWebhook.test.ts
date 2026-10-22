import assert from 'node:assert/strict';
import { ServerPurchaseRequest } from '../src/types/checkout.js';
import {
  buildZapierWebhookPayload,
  emitZapierWebhook,
  resetZapierWebhookStateForTests,
  setZapierWebhookFetchForTests,
  setZapierWebhookUrlForTests,
} from '../src/services/zapierWebhookService.js';

let passed = 0;
let failed = 0;

async function run(name: string, test: () => Promise<void> | void): Promise<void> {
  try {
    await test();
    console.log(`  PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL ${name}`, error);
    failed++;
  } finally {
    resetZapierWebhookStateForTests();
  }
}

const request: ServerPurchaseRequest = {
  id: 'REQ-ZAPIER-1', title: 'Secure monitor', category: 'IT', prompt: 'test', budgetLimit: 600,
  quantity: 2, catalogItemId: 'CAT-101', createdAt: '2026-10-22T00:00:00.000Z', status: 'paid',
  authoritativeUnitPrice: 529, authoritativeTotal: 1058, currency: 'USD', selectedSupplier: 'Apex',
  selectedItemName: 'Monitor', urgency: 'standard', policyDecision: 'ALLOWED',
  paymentDetails: { paypalOrderId: 'ORDER-1', captureId: 'CAP-1', status: 'COMPLETED', amount: 1058, currency: 'USD', capturedAt: '2026-10-22T01:00:00.000Z', isSandbox: true },
};

async function main(): Promise<void> {
await run('builds a whitelisted payment payload from verified backend state', () => {
  const payload = buildZapierWebhookPayload('purchase_request.payment_updated', request);
  assert.equal(payload.event, 'purchase_request.payment_updated');
  assert.match(payload.eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(payload.data.status, 'paid');
  assert.equal(payload.data.paymentDetails?.status, 'COMPLETED');
  assert.deepEqual(Object.keys(payload.data).sort(), ['authoritativeTotal', 'category', 'currency', 'paymentDetails', 'policyDecision', 'quantity', 'requestId', 'status', 'title']);
});

await run('skips delivery when configuration is missing', async () => {
  setZapierWebhookUrlForTests(undefined);
  let calls = 0;
  setZapierWebhookFetchForTests(async () => { calls++; return { ok: true, status: 200 }; });
  await emitZapierWebhook('purchase_request.updated', request);
  assert.equal(calls, 0);
});

await run('does not throw or retry after a delivery failure', async () => {
  setZapierWebhookUrlForTests('https://hooks.zapier.com/hooks/catch/test/test/');
  let calls = 0;
  setZapierWebhookFetchForTests(async () => { calls++; throw new Error('network unavailable'); });
  await emitZapierWebhook('purchase_request.updated', request);
  assert.equal(calls, 1);
});

await run('deduplicates a SpendGuard alert for the same policy outcome', async () => {
  setZapierWebhookUrlForTests('https://hooks.zapier.com/hooks/catch/test/test/');
  let calls = 0;
  setZapierWebhookFetchForTests(async () => { calls++; return { ok: true, status: 202 }; });
  await emitZapierWebhook('spendguard.policy_alert', request, 'policy:REQ-ZAPIER-1:BLOCKED');
  await emitZapierWebhook('spendguard.policy_alert', request, 'policy:REQ-ZAPIER-1:BLOCKED');
  assert.equal(calls, 1);
});

console.log(`Zapier webhook tests: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
}

void main();
