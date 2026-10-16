import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import {
  setPayPalTransportMock,
  clearPayPalTokenCache,
} from '../src/services/paypalService.js';
import {
  getPurchaseRequestById,
  resetPurchaseRequests,
  updatePurchaseRequestStatus,
} from '../src/data/purchaseRequests.js';
import { Server } from 'node:http';

console.log('🧪 Starting Procura AI PayPal Checkout Integration Test Suite...\n');

let testsPassed = 0;
let testsFailed = 0;

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// Start test HTTP server instance on dynamic ephemeral port
const app = createServer();
let server: Server;
let serverPort: number;
let baseUrl: string;

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address !== null) {
        serverPort = address.port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
      }
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

// Standard mock token and capture fixtures
const MOCK_TOKEN = 'mock-paypal-access-token-xyz123';
const MOCK_ORDER_ID = 'MOCK-PAYPAL-ORDER-777';
const MOCK_CAPTURE_ID = 'MOCK-CAPTURE-888';

function standardMockTransport(options?: {
  tokenFail?: boolean;
  orderFail?: boolean;
  captureFail?: boolean;
  capturedAmount?: string;
  captureStatus?: string;
}) {
  return async (url: string, reqOptions: RequestInit) => {
    // 1. OAuth Token Request
    if (url.includes('/v1/oauth2/token')) {
      if (options?.tokenFail) {
        return {
          status: 401,
          ok: false,
          json: async () => ({ error: 'invalid_client', error_description: 'Client Authentication failed' }),
          text: async () => 'Unauthorized',
        };
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 3600 }),
        text: async () => '',
      };
    }

    // 2. Create Order Request
    if (url.includes('/v2/checkout/orders') && reqOptions.method === 'POST' && !url.includes('/capture')) {
      if (options?.orderFail) {
        return {
          status: 500,
          ok: false,
          json: async () => ({ name: 'INTERNAL_SERVER_ERROR', message: 'PayPal backend error' }),
          text: async () => 'Internal Server Error',
        };
      }
      const body = JSON.parse(reqOptions.body as string);
      return {
        status: 201,
        ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: 'CREATED',
          intent: 'CAPTURE',
          purchase_units: body.purchase_units,
          links: [
            { href: `https://www.sandbox.paypal.com/checkoutnow?token=${MOCK_ORDER_ID}`, rel: 'approve' },
          ],
        }),
        text: async () => '',
      };
    }

    // 3. Capture Order Request
    if (url.includes('/capture')) {
      if (options?.captureFail) {
        return {
          status: 422,
          ok: false,
          json: async () => ({ name: 'UNPROCESSABLE_ENTITY', message: 'Instrument declined' }),
          text: async () => 'Unprocessable',
        };
      }
      return {
        status: 201,
        ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: options?.captureStatus || 'COMPLETED',
          purchase_units: [
            {
              reference_id: 'REQ-2026-081',
              payments: {
                captures: [
                  {
                    id: MOCK_CAPTURE_ID,
                    status: options?.captureStatus || 'COMPLETED',
                    amount: {
                      currency_code: 'USD',
                      value: options?.capturedAmount || '1058.00',
                    },
                  },
                ],
              },
            },
          ],
        }),
        text: async () => '',
      };
    }

    // 4. Get Order Details Request
    if (url.includes(`/v2/checkout/orders/${MOCK_ORDER_ID}`)) {
      return {
        status: 200,
        ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: 'COMPLETED',
          purchase_units: [
            {
              reference_id: 'REQ-2026-081',
              payments: {
                captures: [
                  {
                    id: MOCK_CAPTURE_ID,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '1058.00' },
                  },
                ],
              },
            },
          ],
        }),
        text: async () => '',
      };
    }

    return {
      status: 404,
      ok: false,
      json: async () => ({ message: 'Not found in mock' }),
      text: async () => 'Not found',
    };
  };
}

async function runAllTests() {
  await startServer();

  try {
    // -----------------------------------------------------------------------------
    // Test 1: Blocked purchase rejected by procurement policy
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 1: Blocked purchase request cannot create PayPal order', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // REQ-2026-082 is 10 units of Herman Miller Aeron ($11,950 > $10,000 max single order budget)
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-082' }),
      });

      assert.equal(res.status, 400, 'Should reject non-approved status before policy or with 400/422');
      const data = await res.json();
      assert.equal(data.success, false);
    });

    // -----------------------------------------------------------------------------
    // Test 2: Purchase awaiting approval or draft rejected from checkout
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 2: Purchases in draft or pending_approval cannot be checked out', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // REQ-2026-080 is pending_approval
      const pendingRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-080' }),
      });
      assert.equal(pendingRes.status, 400);
      const pendingData = await pendingRes.json();
      assert.equal(pendingData.error, 'AWAITING_APPROVAL');

      // REQ-2026-078 is draft
      const draftRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-078' }),
      });
      assert.equal(draftRes.status, 400);
      const draftData = await draftRes.json();
      assert.equal(draftData.error, 'DRAFT_STATUS');
    });

    // -----------------------------------------------------------------------------
    // Test 3: Tampered prices/totals ignored, authoritative calculation enforced
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 3: Server ignores client prices and computes authoritative total', async () => {
      resetPurchaseRequests();
      let sentAmountToPayPal: string | undefined;

      setPayPalTransportMock(async (url: string, reqOptions: RequestInit) => {
        if (url.includes('/oauth2/token')) {
          return {
            status: 200,
            ok: true,
            json: async () => ({ access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 3600 }),
            text: async () => '',
          };
        }
        if (url.includes('/orders') && reqOptions.method === 'POST') {
          const body = JSON.parse(reqOptions.body as string);
          sentAmountToPayPal = body.purchase_units[0].amount.value;
          return {
            status: 201,
            ok: true,
            json: async () => ({ id: MOCK_ORDER_ID, status: 'CREATED', purchase_units: body.purchase_units }),
            text: async () => '',
          };
        }
        return { status: 404, ok: false, json: async () => ({}), text: async () => '' };
      });

      // Try sending a tampered price/total in request body
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          total: 1.0, // Fraudulent price attempt
          unitPrice: 0.5,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.amount.total, 1058.0, 'Must match 2 * $529.00 authoritative catalog price');
      assert.equal(sentAmountToPayPal, '1058.00', 'Must send authoritative $1058.00 to PayPal');
    });

    // -----------------------------------------------------------------------------
    // Test 4: Unknown purchase request ID returns 404
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 4: Unknown purchase request ID returns 404', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-UNKNOWN-999' }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'NOT_FOUND');
    });

    // -----------------------------------------------------------------------------
    // Test 5: Mismatched order IDs between purchase request and capture
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 5: Capture rejects mismatched PayPal order ID', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // Create valid order first
      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      // Attempt to capture with a completely different order ID
      const captureRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: 'COMPLETELY-DIFFERENT-ORDER-999',
        }),
      });

      assert.equal(captureRes.status, 400);
      const captureData = await captureRes.json();
      assert.equal(captureData.error, 'ORDER_MISMATCH');
    });

    // -----------------------------------------------------------------------------
    // Test 6: Successful capture transitions status to paid
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 6: Successful PayPal capture marks purchase as paid', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // 1. Create order
      const createRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(createRes.status, 200);

      // Verify before capture: status is still 'approved'
      const preCapture = getPurchaseRequestById('REQ-2026-081');
      assert.equal(preCapture?.status, 'approved', 'Must remain approved before capture');

      // 2. Capture order
      const captureRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      assert.equal(captureRes.status, 200);
      const captureData = await captureRes.json();
      assert.equal(captureData.success, true);
      assert.equal(captureData.status, 'COMPLETED');
      assert.equal(captureData.captureId, MOCK_CAPTURE_ID);

      // Verify after capture: status MUST be 'paid'
      const postCapture = getPurchaseRequestById('REQ-2026-081');
      assert.equal(postCapture?.status, 'paid', 'Status must transition to paid');
      assert.equal(postCapture?.paymentDetails?.status, 'COMPLETED');
      assert.equal(postCapture?.paymentDetails?.amount, 1058.0);
    });

    // -----------------------------------------------------------------------------
    // Test 7: Incorrect capture amount rejects payment and does NOT mark as paid
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 7: Incorrect capture amount rejected without marking paid', async () => {
      resetPurchaseRequests();
      // PayPal captures $10.00 instead of authoritative $1058.00
      setPayPalTransportMock(standardMockTransport({ capturedAmount: '10.00' }));

      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      const captureRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      assert.equal(captureRes.status, 422);
      const data = await captureRes.json();
      assert.equal(data.error, 'AMOUNT_MISMATCH');

      // MUST NOT be marked as paid
      const record = getPurchaseRequestById('REQ-2026-081');
      assert.notEqual(record?.status, 'paid', 'Should not mark purchase as paid if amount does not match');
    });

    // -----------------------------------------------------------------------------
    // Test 8: Duplicate capture attempt is rejected
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 8: Duplicate capture attempts are prevented', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // First successful capture
      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      // Second duplicate capture attempt
      const dupRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      assert.equal(dupRes.status, 409);
      const dupData = await dupRes.json();
      assert.equal(dupData.error, 'ALREADY_PAID');
    });

    // -----------------------------------------------------------------------------
    // Test 9: Cancelled payment handled safely
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 9: User cancelled checkout handled safely without marking paid', async () => {
      resetPurchaseRequests();

      const cancelRes = await fetch(`${baseUrl}/api/checkout/cancel-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          reason: 'User closed popup',
        }),
      });

      assert.equal(cancelRes.status, 200);
      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.equal(purchase?.status, 'approved', 'Cancelled checkout leaves request in approved status');
      assert.equal(purchase?.paymentDetails?.status, 'CANCELLED');
    });

    // -----------------------------------------------------------------------------
    // Test 10: PayPal API failure handled safely
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 10: PayPal API 500 failure handled gracefully', async () => {
      resetPurchaseRequests();
      clearPayPalTokenCache();
      setPayPalTransportMock(standardMockTransport({ orderFail: true }));

      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      assert.equal(res.status, 500);
      const data = await res.json();
      assert.equal(data.error, 'PAYPAL_API_ERROR');

      // Verify request is intact
      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.equal(purchase?.status, 'approved');
    });

    // -----------------------------------------------------------------------------
    // Test 11: Purchase is NEVER marked paid if capture fails
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 11: Purchase is NEVER marked paid before verified capture', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport({ captureFail: true }));

      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      const res = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      assert.equal(res.status, 422);
      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.notEqual(purchase?.status, 'paid', 'Failed capture MUST NEVER mark as paid');
    });

    // -----------------------------------------------------------------------------
    // Test 12: GET /api/checkout/config never exposes secret
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 12: GET /api/checkout/config never exposes client secret', async () => {
      const res = await fetch(`${baseUrl}/api/checkout/config`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.equal(text.includes('ECyFdaFaFfJmWw0Ckl4qiI1K'), false, 'Client secret MUST NOT be leaked');
    });

    // -----------------------------------------------------------------------------
    // Test 13: create-order response always contains a non-empty orderId string
    //
    // Root-cause regression test for the silent failure identified in the
    // PayPalCheckoutModal investigation:
    //   - renderPayPalButtons called createCheckoutOrder() and returned res.orderId
    //     to the PayPal SDK.
    //   - If PayPal ever returned an order object without an `id` field (e.g. a
    //     malformed mock or unexpected API shape), res.orderId would be undefined.
    //   - The SDK would silently proceed with undefined as the token, preventing
    //     the approval popup from opening.
    //   - The client now guards: if (!res.orderId) throw Error(...)
    //   - This test verifies the backend always returns a populated orderId so
    //     the guard is not triggered in the normal path.
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 13: create-order response always contains a non-empty orderId string', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true, 'Response must have success: true');
      assert.equal(typeof data.orderId, 'string', 'orderId must be a string');
      assert.ok(data.orderId.length > 0, 'orderId must be non-empty');
      assert.equal(data.orderId, MOCK_ORDER_ID, 'orderId must match the PayPal-returned order ID');
      // Sanity: isSandbox flag must be true, and serverCalculated must be true
      assert.equal(data.isSandbox, true);
      assert.equal(data.serverCalculated, true);
    });

    // -----------------------------------------------------------------------------
    // Test 14: Dashboard authoritative requests synchronization after verified capture
    //
    // Regression test for the History dashboard sync issue:
    //   - Verifies that after a successful PayPal capture, GET /api/requests reflects
    //     status: 'paid' and populated paymentDetails for REQ-2026-081.
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 14: GET /api/requests reflects status paid and paymentDetails after capture', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // 1. Create order
      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      // 2. Capture order
      const captureRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });
      assert.equal(captureRes.status, 200);

      // 3. Query all requests via dashboard API
      const syncRes = await fetch(`${baseUrl}/api/requests`);
      assert.equal(syncRes.status, 200);
      const syncData = await syncRes.json();
      assert.equal(syncData.success, true);
      const target = syncData.data.find((r: any) => r.id === 'REQ-2026-081');
      assert.ok(target, 'Target purchase request must exist in sync data');
      assert.equal(target.status, 'paid', 'Status must be paid');
      assert.equal(target.paymentDetails?.status, 'COMPLETED', 'Payment details status must be COMPLETED');
      assert.equal(target.paymentDetails?.paypalOrderId, MOCK_ORDER_ID);
      assert.equal(target.paymentDetails?.captureId, MOCK_CAPTURE_ID);
    });

    // -----------------------------------------------------------------------------
    // Test 15: Single request retrieval GET /api/requests/:id reflects authoritative settlement
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 15: GET /api/requests/:id returns authoritative settlement details', async () => {
      const singleRes = await fetch(`${baseUrl}/api/requests/REQ-2026-081`);
      assert.equal(singleRes.status, 200);
      const singleData = await singleRes.json();
      assert.equal(singleData.success, true);
      assert.equal(singleData.data.status, 'paid');
      assert.equal(singleData.data.paypalOrderId, MOCK_ORDER_ID);
      assert.equal(singleData.data.paymentDetails?.captureId, MOCK_CAPTURE_ID);
    });

    // -----------------------------------------------------------------------------
    // Test 16: Buyer cancellation records CANCELLED payment while preserving approved status
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 16: POST /api/checkout/cancel-order records cancellation without invalidating approval', async () => {
      resetPurchaseRequests();

      const cancelRes = await fetch(`${baseUrl}/api/checkout/cancel-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: 'MOCK-ORDER-CANCEL-1',
          reason: 'User closed popup before completing payment',
        }),
      });

      assert.equal(cancelRes.status, 200);
      const cancelData = await cancelRes.json();
      assert.equal(cancelData.success, true);

      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.ok(purchase);
      assert.equal(purchase.status, 'approved', 'Status must remain approved so user can retry');
      assert.equal(purchase.paymentDetails?.status, 'CANCELLED');
      assert.equal(purchase.paymentDetails?.notes, 'User closed popup before completing payment');
    });

    // -----------------------------------------------------------------------------
    // Test 17: Incomplete capture status (FAILED) is rejected without marking request paid
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 17: Capture status other than COMPLETED rejects with 422 and marks payment FAILED', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport({ captureStatus: 'FAILED' }));

      // Create order
      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      // Capture order
      const res = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseRequestId: 'REQ-2026-081',
          orderId: MOCK_ORDER_ID,
        }),
      });

      assert.equal(res.status, 422);
      const data = await res.json();
      assert.equal(data.error, 'CAPTURE_NOT_COMPLETED');

      const purchase = getPurchaseRequestById('REQ-2026-081');
      assert.ok(purchase);
      assert.notEqual(purchase.status, 'paid', 'Failed capture MUST NEVER mark as paid');
      assert.equal(purchase.paymentDetails?.status, 'FAILED');
    });

    // -----------------------------------------------------------------------------
    // Test 18: Idempotency safety — Duplicate capture call maintains verified settlement state
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 18: Duplicate capture requests maintain pristine settlement record', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(standardMockTransport());

      // 1. Initial order creation & capture
      await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });

      const firstCapture = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId: MOCK_ORDER_ID }),
      });
      assert.equal(firstCapture.status, 200);

      // 2. Duplicate capture attempt
      const secondCapture = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId: MOCK_ORDER_ID }),
      });
      assert.equal(secondCapture.status, 409);

      // 3. Status endpoint returns COMPLETED record idempotently
      const statusRes = await fetch(`${baseUrl}/api/checkout/status/${MOCK_ORDER_ID}`);
      assert.equal(statusRes.status, 200);
      const statusData = await statusRes.json();
      assert.equal(statusData.status, 'COMPLETED');
      assert.equal(statusData.purchaseStatus, 'paid');
      assert.equal(statusData.captureId, MOCK_CAPTURE_ID);
    });

    // -----------------------------------------------------------------------------
    // Test 19: Persistent JSON store validation
    // -----------------------------------------------------------------------------
    await runAsyncTest('Test 19: Persistent storage file exists and contains valid JSON schema', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const candidates = [
        path.resolve(process.cwd(), 'server', 'data', 'purchaseRequests.json'),
        path.resolve(process.cwd(), 'data', 'purchaseRequests.json'),
      ];
      const filePath = candidates.find((c) => fs.existsSync(c));
      assert.ok(filePath, 'Persisted JSON storage file must exist on disk');

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      assert.ok(Array.isArray(parsed), 'Persisted data must be an array');
      const req81 = parsed.find((r: any) => r.id === 'REQ-2026-081');
      assert.ok(req81, 'REQ-2026-081 must exist in persisted ledger');
      assert.equal(req81.status, 'paid', 'REQ-2026-081 must be marked paid in persisted ledger');
    });
  } finally {
    setPayPalTransportMock(null);
    clearPayPalTokenCache();
    await stopServer();
  }

  console.log('\n========================================');
  console.log(`Checkout Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
