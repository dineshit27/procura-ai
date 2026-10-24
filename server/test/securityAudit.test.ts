/**
 * Procura AI — Security & Concurrency Audit Test Suite
 *
 * Tests:
 *  1. Spoofed x-user-role header is rejected (unknown role)
 *  2. Missing x-user-role header is rejected
 *  3. Known privileged roles are accepted in the test environment
 *  4. Production rejects header-only admin authorization
 *  5. Currency mismatch on capture returns 422 CURRENCY_MISMATCH
 *  6. Correct currency on capture succeeds
 *  7. Duplicate PayPal order creation returns 409 ORDER_ALREADY_EXISTS
 *  8. Concurrent request creation cannot bypass cumulative budget
 *  9. Concurrent approvals — only one succeeds within tight budget
 * 10. Repeated checkout attempts after an existing order is blocked
 * 11. PATCH /status cannot set paid (HTTP 403)
 */

import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import {
  setPayPalTransportMock,
  clearPayPalTokenCache,
} from '../src/services/paypalService.js';
import {
  resetPurchaseRequests,
  setPurchaseRequest,
  getPurchaseRequestById,
} from '../src/data/purchaseRequests.js';
import {
  getActivePolicy,
  resetPolicyToDefault,
  updateActivePolicy,
} from '../src/config/policySettings.js';
import {
  getSpendGuardSummary,
  atomicApproveRequest,
} from '../src/services/spendGuardService.js';
import { Server } from 'node:http';
import { setAuthClientsForTests, type AuthClients } from '../src/middleware/auth.js';

console.log('🔐  Starting Procura AI Security & Concurrency Audit Test Suite...\n');

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log('  ✅ [PASS] ' + name);
    passed++;
  } catch (err: unknown) {
    console.error('  ❌ [FAIL] ' + name);
    console.error('     ', (err as Error)?.message ?? err);
    failed++;
  }
}

const app = createServer();
let server: Server;
let baseUrl: string;

// Helper to build a mock AuthClients for a given role.
function mockClients(role: string, userId = 'audit-user'): AuthClients {
  return {
    publicClient: {
      auth: { getUser: async () => ({ data: { user: { id: userId, email: `${role}@example.com` } }, error: null }) },
    } as AuthClients['publicClient'],
    adminClient: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }) }) }),
    } as AuthClients['adminClient'],
  };
}

// Default: inject an admin client so most HTTP-level tests can reach business
// logic without hitting 401.  Individual tests that need a different role
// call setAuthClientsForTests inline and restore afterward.
setAuthClientsForTests(() => mockClients('admin', 'audit-admin'));

// Transparently attach a Bearer token to every request aimed at the test server.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!baseUrl || !url.startsWith(baseUrl)) return nativeFetch(input, init);
  const headers = new Headers(init?.headers);
  // Only set Authorization if the individual test has not already set it.
  // Tests checking 401 (no token) must explicitly pass an empty Authorization.
  if (!headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer audit-test-access-token');
  }
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

// Mock PayPal transport — supports injecting different currencies and amounts
type MockOpts = { currency?: string; amount?: number; orderId?: string; captureId?: string };
function makeMockTransport(opts: MockOpts = {}) {
  const {
    currency = 'USD',
    amount = 1058.0,
    orderId = 'MOCK-AUDIT-ORDER-001',
    captureId = 'MOCK-AUDIT-CAP-001',
  } = opts;
  return async (url: string, _opts: RequestInit) => {
    if (url.includes('/v1/oauth2/token')) {
      return {
        status: 200, ok: true,
        json: async () => ({ access_token: 'mock-audit-token', expires_in: 32400 }),
        text: async () => '',
      };
    }
    if (url.includes('/v2/checkout/orders') && !url.includes('/capture')) {
      return {
        status: 201, ok: true,
        json: async () => ({
          id: orderId,
          status: 'CREATED',
          links: [{ rel: 'approve', href: `https://sandbox.paypal.com/checkoutnow?token=${orderId}` }],
        }),
        text: async () => '',
      };
    }
    if (url.includes('/capture')) {
      return {
        status: 201, ok: true,
        json: async () => ({
          id: orderId,
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: captureId,
                status: 'COMPLETED',
                amount: { currency_code: currency, value: amount.toFixed(2) },
              }],
            },
          }],
        }),
        text: async () => '',
      };
    }
    return { status: 404, ok: false, json: async () => ({ message: 'Not found' }), text: async () => '' };
  };
}

async function runAllTests(): Promise<void> {
  await startServer();

  try {
    // -----------------------------------------------------------------------
    // Test 1: No bearer token → 401 UNAUTHENTICATED
    // (The old x-user-role header system is gone; missing token = 401, not 403)
    // -----------------------------------------------------------------------
    await runTest('Test 1: Missing bearer token returns 401 UNAUTHENTICATED', async () => {
      // Bypass the fetch shim by sending Authorization: '' (empty)
      const res = await nativeFetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cumulativeBudgetLimit: 9999999 }),
      });
      assert.equal(res.status, 401,
        `Expected 401 for request with no bearer token but got ${res.status}`);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'UNAUTHENTICATED');
    });

    // -----------------------------------------------------------------------
    // Test 2: Requester role cannot update policy → 403 FORBIDDEN
    // (Server-side role check: requester lacks manage_policies permission)
    // -----------------------------------------------------------------------
    await runTest('Test 2: Requester role cannot update spending policy (server-side RBAC)', async () => {
      setAuthClientsForTests(() => mockClients('requester', 'audit-requester'));
      const res = await fetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cumulativeBudgetLimit: 9999999 }),
      });
      setAuthClientsForTests(() => mockClients('admin', 'audit-admin'));
      assert.equal(res.status, 403);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'FORBIDDEN');
    });

    // -----------------------------------------------------------------------
    // Test 3: Admin role with valid token can update policy → 200
    // -----------------------------------------------------------------------
    await runTest('Test 3: Admin role with valid bearer token can update policy (200)', async () => {
      setAuthClientsForTests(() => mockClients('admin', 'audit-admin'));
      const res = await fetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentName: 'Security Audit Test Dept' }),
      });
      assert.equal(res.status, 200,
        `Expected 200 for admin PUT but got ${res.status}`);
      resetPolicyToDefault();
    });

    // -----------------------------------------------------------------------
    // Test 4: x-user-role header is completely ignored by the server — role
    // always comes from the Supabase profiles table, never from a client header
    // -----------------------------------------------------------------------
    await runTest('Test 4: x-user-role header is ignored; role is always resolved server-side', async () => {
      // Inject a requester profile but send x-user-role: admin — must still get 403
      setAuthClientsForTests(() => mockClients('requester', 'audit-requester'));
      const res = await fetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ departmentName: 'Should remain unchanged' }),
      });
      setAuthClientsForTests(() => mockClients('admin', 'audit-admin'));
      // x-user-role: admin MUST be ignored; only the profiles table role counts
      assert.equal(res.status, 403,
        `x-user-role: admin header must not elevate permissions (got ${res.status})`);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'FORBIDDEN');
    });

    // -----------------------------------------------------------------------
    // Test 5: Currency mismatch on capture → 422 CURRENCY_MISMATCH
    // -----------------------------------------------------------------------
    await runTest('Test 4: Capture with wrong currency returns 422 CURRENCY_MISMATCH', async () => {
      resetPurchaseRequests();
      // Use EUR in the mock but the purchase is stored as USD
      setPayPalTransportMock(makeMockTransport({ currency: 'EUR', amount: 1058.0 }));

      // First create an order for an approved purchase
      const createRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(createRes.status, 200);
      const { orderId } = await createRes.json() as { orderId: string };

      // Attempt capture — should fail with CURRENCY_MISMATCH
      const capRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId }),
      });
      assert.equal(capRes.status, 422);
      const capData = await capRes.json() as { error: string };
      assert.equal(capData.error, 'CURRENCY_MISMATCH');

      // Verify the purchase was NOT marked as paid
      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.ok(purchase?.status !== 'paid', 'Purchase must not be marked paid after currency mismatch');
    });

    // -----------------------------------------------------------------------
    // Test 5: Correct currency on capture marks request paid
    // -----------------------------------------------------------------------
    await runTest('Test 5: Capture with matching currency (USD) succeeds and marks paid', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(makeMockTransport({ currency: 'USD', amount: 1058.0 }));

      const createRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(createRes.status, 200);
      const { orderId } = await createRes.json() as { orderId: string };

      const capRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId }),
      });
      assert.equal(capRes.status, 200);
      const capData = await capRes.json() as { purchase: { status: string } };
      assert.equal(capData.purchase.status, 'paid');
    });

    // -----------------------------------------------------------------------
    // Test 6: Duplicate PayPal order creation → 409 ORDER_ALREADY_EXISTS
    // -----------------------------------------------------------------------
    await runTest('Test 6: Duplicate create-order returns 409 ORDER_ALREADY_EXISTS', async () => {
      // REQ-2026-081 is already in 'paid' state after Test 5, reset to approved with a paypalOrderId
      resetPurchaseRequests();
      setPayPalTransportMock(makeMockTransport({ currency: 'USD', amount: 1058.0 }));

      // Create the first order
      const first = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(first.status, 200);

      // Attempt to create a second order for the same request while one is in flight
      const second = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(second.status, 409);
      const secondData = await second.json() as { error: string; orderId: string };
      assert.equal(secondData.error, 'ORDER_ALREADY_EXISTS');
      assert.ok(secondData.orderId, 'Response must include the existing orderId');
    });

    // -----------------------------------------------------------------------
    // Test 7: Concurrent request creation cannot bypass cumulative budget
    // -----------------------------------------------------------------------
    await runTest('Test 7: Concurrent POST /api/requests cannot collectively exceed cumulative budget', async () => {
      resetPurchaseRequests();
      resetPolicyToDefault();

      // Set a tight limit: current committed + $600 headroom (CAT-101 = $529/unit, so one fits, two do not)
      const currentCommitted = getSpendGuardSummary().totalCommitted;
      const tightLimit = currentCommitted + 600.0;
      updateActivePolicy({ cumulativeBudgetLimit: tightLimit });

      // Fire two concurrent requests for $529 each (CAT-101)
      const makeRequest = (id: string) =>
        fetch(`${baseUrl}/api/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: `Concurrent Creation ${id}`,
            category: 'IT & Hardware',
            prompt: 'Concurrent budget check test',
            budgetLimit: 600,
            quantity: 1,
            catalogItemId: 'CAT-101',
            status: 'approved',
            urgency: 'standard',
          }),
        });

      const [r1, r2] = await Promise.all([
        makeRequest('REQ-CONCURRENT-CREATE-001'),
        makeRequest('REQ-CONCURRENT-CREATE-002'),
      ]);

      const [d1, d2] = await Promise.all([r1.json(), r2.json()]) as [
        { success: boolean; data?: { status: string } },
        { success: boolean; data?: { status: string } },
      ];

      // Both requests must succeed in creation, but the one that would breach
      // the budget is demoted to 'pending_approval' (not approved/reserved).
      assert.equal(r1.status, 201, `Request 1 should be created (got ${r1.status})`);
      assert.equal(r2.status, 201, `Request 2 should be created (got ${r2.status})`);

      // At most one can be in 'approved' (reserved) state
      const statuses = [d1.data?.status, d2.data?.status];
      const approvedCount = statuses.filter((s) => s === 'approved').length;
      assert.ok(approvedCount <= 1,
        `At most 1 request should be auto-approved within budget. Got ${approvedCount} approved. Statuses: ${JSON.stringify(statuses)}`);

      resetPolicyToDefault();
    });

    // -----------------------------------------------------------------------
    // Test 8: Concurrent approvals — exactly one approved within tight budget
    // -----------------------------------------------------------------------
    await runTest('Test 8: Concurrent PATCH /status approvals — only one succeeds within tight budget', async () => {
      resetPurchaseRequests();
      resetPolicyToDefault();

      const currentCommitted = getSpendGuardSummary().totalCommitted;
      const tightLimit = currentCommitted + 600.0;
      updateActivePolicy({ cumulativeBudgetLimit: tightLimit });

      // Create two pending requests
      const p1 = setPurchaseRequest({
        id: 'REQ-CONCURRENT-APPROVE-001',
        title: 'Concurrent Approval A',
        category: 'IT & Hardware',
        prompt: 'test',
        budgetLimit: 600,
        quantity: 1,
        catalogItemId: 'CAT-101',
        createdAt: new Date().toISOString(),
        status: 'pending_approval',
        authoritativeUnitPrice: 529.0,
        authoritativeTotal: 529.0,
        currency: 'USD',
        selectedSupplier: 'Apex Business Hardware (Demo Supplier)',
        selectedItemName: 'Dell UltraSharp 27" 4K Monitor',
        urgency: 'standard',
        policyDecision: 'NEEDS_APPROVAL',
      });

      const p2 = setPurchaseRequest({
        id: 'REQ-CONCURRENT-APPROVE-002',
        title: 'Concurrent Approval B',
        category: 'IT & Hardware',
        prompt: 'test',
        budgetLimit: 600,
        quantity: 1,
        catalogItemId: 'CAT-101',
        createdAt: new Date().toISOString(),
        status: 'pending_approval',
        authoritativeUnitPrice: 529.0,
        authoritativeTotal: 529.0,
        currency: 'USD',
        selectedSupplier: 'Apex Business Hardware (Demo Supplier)',
        selectedItemName: 'Dell UltraSharp 27" 4K Monitor',
        urgency: 'standard',
        policyDecision: 'NEEDS_APPROVAL',
      });

      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/requests/${p1.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        }),
        fetch(`${baseUrl}/api/requests/${p2.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        }),
      ]);

      const successes = [res1.status, res2.status].filter((s) => s === 200).length;
      const rejections = [res1.status, res2.status].filter((s) => s === 422).length;

      assert.equal(successes, 1, `Exactly 1 approval should succeed (got ${successes})`);
      assert.equal(rejections, 1, `Exactly 1 approval should be rejected (got ${rejections})`);

      resetPolicyToDefault();
    });

    // -----------------------------------------------------------------------
    // Test 9: Repeated checkout after ORDER_ALREADY_EXISTS — old order still accessible
    // -----------------------------------------------------------------------
    await runTest('Test 9: After ORDER_ALREADY_EXISTS, original orderId is returned in 409 response', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(makeMockTransport({
        currency: 'USD',
        amount: 1058.0,
        orderId: 'MOCK-ORIG-ORDER-999',
      }));

      // Create a valid order
      const first = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(first.status, 200);
      const { orderId: originalOrderId } = await first.json() as { orderId: string };
      assert.equal(originalOrderId, 'MOCK-ORIG-ORDER-999');

      // Retry create-order
      const retry = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(retry.status, 409);
      const retryData = await retry.json() as { error: string; orderId: string };
      assert.equal(retryData.error, 'ORDER_ALREADY_EXISTS');
      // Must return the ORIGINAL orderId so the client can resume the existing flow
      assert.equal(retryData.orderId, 'MOCK-ORIG-ORDER-999');
    });

    // -----------------------------------------------------------------------
    // Test 10: Cannot set paid via PATCH (preserved security check)
    // -----------------------------------------------------------------------
    await runTest('Test 10: PATCH /api/requests/:id/status cannot set status=paid (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/api/requests/REQ-2026-081/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      assert.equal(res.status, 403);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'PAYMENT_VERIFICATION_REQUIRED');
    });

  } finally {
    setPayPalTransportMock(null);
    clearPayPalTokenCache();
    resetPurchaseRequests();
    resetPolicyToDefault();
    await stopServer();
  }

  console.log('\n========================================');
  console.log(`Security & Concurrency Audit Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Audit test execution error:', err);
  process.exit(1);
});
