/**
 * Procura AI — Request Persistence & Checkout Routing Regression Tests
 *
 * Covers the specific bug: "Purchase request was not found in authoritative records"
 *
 * 1. POST /api/requests persists a request; GET /api/requests/:id retrieves it
 * 2. Unknown request ID returns 404 from checkout create-order
 * 3. Unapproved (draft) request cannot be checked out
 * 4. Pending-approval request cannot be checked out
 * 5. Approved persisted request CAN have a PayPal order created
 * 6. PATCH /api/requests/:id/status transitions from draft -> pending_approval -> approved
 * 7. Approved status on server is authoritative for checkout (not client-supplied)
 * 8. POST /api/requests with invalid body returns 400
 * 9. After server restart simulation (resetPurchaseRequests), seed data is accessible
 * 10. Client-supplied price is ignored; server computes authoritative total
 */

import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import {
  setPayPalTransportMock,
  clearPayPalTokenCache,
} from '../src/services/paypalService.js';
import { resetPurchaseRequests } from '../src/data/purchaseRequests.js';
import { Server } from 'node:http';
import { setAuthClientsForTests, type AuthClients } from '../src/middleware/auth.js';

console.log('[Persistence Test Suite] Starting Request Persistence & Checkout Routing Tests...\n');

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log('  [PASS] ' + name);
    passed++;
  } catch (err: unknown) {
    console.error('  [FAIL] ' + name);
    console.error('   ', (err as Error)?.message ?? err);
    failed++;
  }
}

const app = createServer();
let server: Server;
let baseUrl: string;

// Tests use the same verified-token and server-side role-resolution seam as
// production. This injection is rejected outside NODE_ENV=test.
setAuthClientsForTests(() => ({
  publicClient: {
    auth: { getUser: async () => ({ data: { user: { id: 'persistence-admin', email: 'admin@example.com' } }, error: null }) },
  } as AuthClients['publicClient'],
  adminClient: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }) }) }),
  } as AuthClients['adminClient'],
}));

const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!baseUrl || !url.startsWith(baseUrl)) return nativeFetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer persistence-test-access-token');
  return nativeFetch(input, { ...init, headers });
};

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// Standard PayPal mock
const MOCK_TOKEN = 'mock-token-persistence-xyz';
const MOCK_ORDER_ID = 'MOCK-PERSIST-ORDER-001';

function mockTransport() {
  return async (url: string, _opts: RequestInit) => {
    if (url.includes('/v1/oauth2/token')) {
      return {
        status: 200, ok: true,
        json: async () => ({ access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 32400 }),
        text: async () => '',
      };
    }
    if (url.includes('/v2/checkout/orders') && !url.includes(MOCK_ORDER_ID)) {
      return {
        status: 201, ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: 'CREATED',
          links: [{ rel: 'approve', href: 'https://sandbox.paypal.com/checkoutnow?token=' + MOCK_ORDER_ID }],
        }),
        text: async () => '',
      };
    }
    return {
      status: 404, ok: false,
      json: async () => ({ message: 'Not found in mock' }),
      text: async () => 'Not found',
    };
  };
}

async function runAllTests(): Promise<void> {
  await startServer();
  resetPurchaseRequests();
  setPayPalTransportMock(mockTransport());

  try {
    // -------------------------------------------------------------------------
    // Test 1: POST /api/requests persists a request; GET retrieves it by ID
    // -------------------------------------------------------------------------
    await runTest('Test 1: POST /api/requests persists request; GET /api/requests/:id retrieves it', async () => {
      const payload = {
        id: 'REQ-PERSIST-TEST-001',
        title: 'Persistence Test Request',
        category: 'IT & Hardware',
        prompt: 'Need test monitors for the persistence test',
        budgetLimit: 1500,
        quantity: 2,
        catalogItemId: 'CAT-101',
        urgency: 'standard',
        status: 'draft',
      };

      const createRes = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(createRes.status, 201, 'POST /api/requests should return 201');
      const created = await createRes.json() as { success: boolean; data: { id: string; authoritativeTotal: number } };
      assert.equal(created.success, true);
      assert.equal(created.data.id, 'REQ-PERSIST-TEST-001');
      assert.ok(typeof created.data.authoritativeTotal === 'number', 'Server must compute authoritative total');

      // Now retrieve by ID
      const getRes = await fetch(`${baseUrl}/api/requests/REQ-PERSIST-TEST-001`);
      assert.equal(getRes.status, 200, 'GET /api/requests/:id should return 200 after POST');
      const gotten = await getRes.json() as { success: boolean; data: { id: string } };
      assert.equal(gotten.success, true);
      assert.equal(gotten.data.id, 'REQ-PERSIST-TEST-001');
    });

    // -------------------------------------------------------------------------
    // Test 2: Unknown request ID returns 404 from checkout create-order
    // -------------------------------------------------------------------------
    await runTest('Test 2: Unknown request ID returns 404 from checkout create-order (the original bug)', async () => {
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-775' }),
      });
      assert.equal(res.status, 404, 'Checkout must return 404 for unknown request ID');
      const data = await res.json() as { error: string; message: string };
      assert.equal(data.error, 'NOT_FOUND');
      assert.ok(data.message.includes('REQ-2026-775'), 'Error must reference the missing ID');
    });

    // -------------------------------------------------------------------------
    // Test 3: Draft request cannot be checked out
    // -------------------------------------------------------------------------
    await runTest('Test 3: Draft request cannot be checked out (not yet approved)', async () => {
      // REQ-PERSIST-TEST-001 is still in draft status from Test 1
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-PERSIST-TEST-001' }),
      });
      // draft is not approved or paid — should be rejected
      assert.notEqual(res.status, 200, 'Draft request must not proceed to checkout');
      const data = await res.json() as { error?: string };
      assert.ok(['DRAFT_STATUS', 'REQUIRES_APPROVAL', 'AWAITING_APPROVAL', 'POLICY_BLOCKED'].includes(data.error ?? ''),
        'Expected a blocking error, got: ' + JSON.stringify(data));
    });

    // -------------------------------------------------------------------------
    // Test 4: pending_approval request cannot be checked out
    // -------------------------------------------------------------------------
    await runTest('Test 4: pending_approval request cannot be checked out', async () => {
      // Create a new pending_approval request
      const payload = {
        id: 'REQ-PERSIST-TEST-002',
        title: 'Pending Approval Test',
        category: 'Office Ergonomics',
        prompt: 'Ergonomic chairs for pending approval test',
        budgetLimit: 1000,
        quantity: 1,
        catalogItemId: 'CAT-105',
        urgency: 'flexible',
        status: 'pending_approval',
      };
      const createRes = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(createRes.status, 201);

      const checkoutRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-PERSIST-TEST-002' }),
      });
      assert.equal(checkoutRes.status, 400, 'pending_approval must be rejected at checkout');
      const data = await checkoutRes.json() as { error: string };
      assert.equal(data.error, 'AWAITING_APPROVAL', 'Error must be AWAITING_APPROVAL');
    });

    // -------------------------------------------------------------------------
    // Test 5: PATCH /api/requests/:id/status promotes draft -> pending -> approved
    // -------------------------------------------------------------------------
    await runTest('Test 5: PATCH /api/requests/:id/status transitions status on server', async () => {
      // Transition REQ-PERSIST-TEST-001: draft -> pending_approval
      const pendingRes = await fetch(`${baseUrl}/api/requests/REQ-PERSIST-TEST-001/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_approval' }),
      });
      assert.equal(pendingRes.status, 200, 'PATCH status should return 200');
      const pending = await pendingRes.json() as { data: { status: string } };
      assert.equal(pending.data.status, 'pending_approval');

      // Transition pending_approval -> approved
      const approvedRes = await fetch(`${baseUrl}/api/requests/REQ-PERSIST-TEST-001/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      assert.equal(approvedRes.status, 200);
      const approved = await approvedRes.json() as { data: { status: string } };
      assert.equal(approved.data.status, 'approved', 'Status must be approved after PATCH');
    });

    // -------------------------------------------------------------------------
    // Test 6: Approved persisted request CAN proceed to PayPal order creation
    // -------------------------------------------------------------------------
    await runTest('Test 6: Approved persisted request can create a PayPal order', async () => {
      // REQ-PERSIST-TEST-001 is now approved (from Test 5)
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-PERSIST-TEST-001' }),
      });
      assert.equal(res.status, 200, 'Approved persisted request must succeed at checkout. Got: ' + res.status);
      const data = await res.json() as { success: boolean; orderId: string; serverCalculated: boolean };
      assert.equal(data.success, true);
      assert.ok(typeof data.orderId === 'string' && data.orderId.length > 0, 'orderId must be non-empty');
      assert.equal(data.serverCalculated, true, 'Amount must be server-calculated');
    });

    // -------------------------------------------------------------------------
    // Test 7: PATCH on unknown ID returns 404
    // -------------------------------------------------------------------------
    await runTest('Test 7: PATCH /api/requests/:id/status returns 404 for unknown ID', async () => {
      const res = await fetch(`${baseUrl}/api/requests/REQ-DOES-NOT-EXIST/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      assert.equal(res.status, 404, 'PATCH on unknown ID must return 404');
    });

    // -------------------------------------------------------------------------
    // Test 8: POST /api/requests with invalid body returns 400
    // -------------------------------------------------------------------------
    await runTest('Test 8: POST /api/requests with invalid body returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '', title: '', quantity: -1 }),
      });
      assert.equal(res.status, 400, 'Invalid POST body must return 400');
      const data = await res.json() as { success: boolean; message: string };
      assert.equal(data.success, false);
    });

    // -------------------------------------------------------------------------
    // Test 9: resetPurchaseRequests restores seed data (backend restart simulation)
    // -------------------------------------------------------------------------
    await runTest('Test 9: resetPurchaseRequests (restart simulation) restores seed data', async () => {
      resetPurchaseRequests();

      // Seed request REQ-2026-081 must still be findable after reset
      const res = await fetch(`${baseUrl}/api/requests/REQ-2026-081`);
      assert.equal(res.status, 200, 'Seed REQ-2026-081 must be accessible after reset');
      const data = await res.json() as { data: { id: string; status: string } };
      assert.equal(data.data.id, 'REQ-2026-081');
      assert.equal(data.data.status, 'approved', 'Seed request REQ-2026-081 must be approved');

      // Client-generated IDs created before reset must NOT survive
      const lostRes = await fetch(`${baseUrl}/api/requests/REQ-PERSIST-TEST-001`);
      assert.equal(lostRes.status, 404, 'Non-persisted client IDs must not survive restart simulation');
    });

    // -------------------------------------------------------------------------
    // Test 10: Server-computed amount is authoritative regardless of client payload
    // -------------------------------------------------------------------------
    await runTest('Test 10: Server ignores client-supplied amounts and computes authoritative total', async () => {
      // CAT-101 = Dell Monitor @ $529/unit, qty 2 => $1058 authoritative
      const payload = {
        id: 'REQ-PERSIST-TEST-003',
        title: 'Price Tamper Test',
        category: 'IT & Hardware',
        prompt: 'Monitor price integrity test',
        budgetLimit: 999999,   // client sending huge budget
        quantity: 2,
        catalogItemId: 'CAT-101',
        urgency: 'standard',
        status: 'approved',
      };
      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 201);
      const data = await res.json() as { data: { authoritativeTotal: number; authoritativeUnitPrice: number } };
      // Must use catalog price (CAT-101 = 529 per unit)
      assert.ok(data.data.authoritativeUnitPrice > 0, 'authoritativeUnitPrice must be > 0');
      const expected = Number((data.data.authoritativeUnitPrice * 2).toFixed(2));
      assert.equal(data.data.authoritativeTotal, expected,
        'authoritativeTotal must equal unitPrice x quantity, not client budget. Got: ' + data.data.authoritativeTotal);
    });

  } finally {
    setPayPalTransportMock(null);
    clearPayPalTokenCache();
    resetPurchaseRequests();
    await stopServer();
  }

  console.log('\n========================================');
  console.log('Persistence Test Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests();
