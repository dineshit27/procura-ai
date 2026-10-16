/**
 * Procura AI — SpendGuard AI Comprehensive Test Suite
 *
 * Enforces backend spending rules, cumulative period budgets, atomic reservations,
 * concurrency safety, policy persistence, security integrity, and regression protection.
 */

import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import {
  setPayPalTransportMock,
  clearPayPalTokenCache,
} from '../src/services/paypalService.js';
import {
  getAllPurchaseRequests,
  getPurchaseRequestById,
  resetPurchaseRequests,
  setPurchaseRequest,
} from '../src/data/purchaseRequests.js';
import {
  getActivePolicy,
  updateActivePolicy,
  resetPolicyToDefault,
} from '../src/config/policySettings.js';
import {
  getSpendGuardSummary,
  canCommitSpend,
  atomicApproveRequest,
} from '../src/services/spendGuardService.js';
import { evaluatePurchasingPolicy } from '../src/services/policyEngine.js';
import { Server } from 'node:http';

console.log('🛡️  Starting Procura AI SpendGuard Comprehensive Test Suite...\n');

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

// Mock PayPal order & capture IDs
const MOCK_TOKEN = 'mock-spendguard-token-abc';
const MOCK_ORDER_ID = 'MOCK-SPENDGUARD-ORDER-101';
const MOCK_CAPTURE_ID = 'MOCK-SPENDGUARD-CAP-101';

function mockPayPalTransport(amount: number = 529.0) {
  return async (url: string, _opts: RequestInit) => {
    if (url.includes('/v1/oauth2/token')) {
      return {
        status: 200,
        ok: true,
        json: async () => ({ access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 32400 }),
        text: async () => '',
      };
    }
    if (url.includes('/v2/checkout/orders') && !url.includes('/capture')) {
      return {
        status: 201,
        ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: 'CREATED',
          links: [{ rel: 'approve', href: 'https://sandbox.paypal.com/checkoutnow?token=' + MOCK_ORDER_ID }],
        }),
        text: async () => '',
      };
    }
    if (url.includes('/capture')) {
      return {
        status: 201,
        ok: true,
        json: async () => ({
          id: MOCK_ORDER_ID,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: MOCK_CAPTURE_ID,
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: amount.toFixed(2) },
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

async function runAllTests(): Promise<void> {
  await startServer();

  try {
    // -------------------------------------------------------------------------
    // Test 1: Single purchase within budget (auto-approval eligible)
    // -------------------------------------------------------------------------
    await runTest('Test 1: Single purchase within budget evaluates to ALLOWED', () => {
      // CAT-102 is $99.00; 2 units = $198.00 <= $500 auto-approval cap
      const result = evaluatePurchasingPolicy({
        catalogItemId: 'CAT-102',
        quantity: 2,
      });

      assert.equal(result.decision, 'ALLOWED');
      assert.equal(result.requiresHumanApproval, false);
      assert.equal(result.itemizedCost.subtotal, 198.0);
    });

    // -------------------------------------------------------------------------
    // Test 2: Purchase exceeding single-order limit is BLOCKED
    // -------------------------------------------------------------------------
    await runTest('Test 2: Purchase exceeding single-order budget ceiling ($10,000) is BLOCKED', () => {
      // CAT-104 is $1,195.00; 9 units = $10,755.00 > $10,000 limit
      const result = evaluatePurchasingPolicy({
        catalogItemId: 'CAT-104',
        quantity: 9,
      });

      assert.equal(result.decision, 'BLOCKED');
      assert.equal(result.requiresHumanApproval, false);
      const singleOrderRule = result.rules.find((r) => r.ruleId === 'MAX_SINGLE_ORDER_BUDGET');
      assert.ok(singleOrderRule);
      assert.equal(singleOrderRule.status, 'FAILED');
    });

    // -------------------------------------------------------------------------
    // Test 3: Cumulative spending limit reached blocks new orders
    // -------------------------------------------------------------------------
    await runTest('Test 3: Cumulative period budget limit reached BLOCKS purchase', () => {
      // Set a low cumulative budget of $3,000 for strict testing
      const customPolicy = {
        ...getActivePolicy(),
        cumulativeBudgetLimit: 3000.0,
      };

      // Current seed committed spend is $2,318 ($1,260 paid + $1,058 reserved)
      // Adding CAT-101 ($529 x 2 = $1058) gives $2318 + $1058 = $3376 > $3000 limit
      const result = evaluatePurchasingPolicy(
        {
          catalogItemId: 'CAT-101',
          quantity: 2,
          checkCumulativeSpend: true,
        },
        customPolicy,
        { checkCumulativeSpend: true }
      );

      assert.equal(result.decision, 'BLOCKED');
      const cumulativeRule = result.rules.find((r) => r.ruleId === 'CUMULATIVE_PERIOD_BUDGET');
      assert.ok(cumulativeRule, 'CUMULATIVE_PERIOD_BUDGET rule must be present');
      assert.equal(cumulativeRule.status, 'FAILED');
      assert.ok(result.reasons.some((r) => r.includes('Cumulative spending limit exceeded')));
    });

    // -------------------------------------------------------------------------
    // Test 4: Concurrency Safety — Two simultaneous requests attempting to exceed budget
    // -------------------------------------------------------------------------
    await runTest('Test 4: Concurrent requests cannot bypass cumulative budget (atomic serialization)', async () => {
      // Configure cumulative budget limit with headroom for exactly ONE $500 request
      resetPurchaseRequests();
      const currentCommitted = getSpendGuardSummary().totalCommitted;
      const tightLimit = currentCommitted + 600.0;

      updateActivePolicy({ cumulativeBudgetLimit: tightLimit });

      // Create two distinct pending requests of $529.00 each
      const req1 = setPurchaseRequest({
        id: 'REQ-CONCURRENT-001',
        title: 'Concurrent Purchase A',
        category: 'IT & Hardware',
        prompt: 'First concurrent monitor',
        budgetLimit: 600,
        quantity: 1, // CAT-101 is $529.00
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

      const req2 = setPurchaseRequest({
        id: 'REQ-CONCURRENT-002',
        title: 'Concurrent Purchase B',
        category: 'IT & Hardware',
        prompt: 'Second concurrent monitor',
        budgetLimit: 600,
        quantity: 1, // CAT-101 is $529.00
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

      // Fire both approvals concurrently
      const [res1, res2] = await Promise.all([
        atomicApproveRequest(req1.id),
        atomicApproveRequest(req2.id),
      ]);

      // Exactly one must succeed, and the other must be rejected due to budget limit!
      const successes = [res1, res2].filter((r) => r.success);
      const rejections = [res1, res2].filter((r) => !r.success);

      assert.equal(successes.length, 1, 'Exactly one concurrent request can be approved within budget');
      assert.equal(rejections.length, 1, 'The competing concurrent request must be rejected');
      assert.ok(rejections[0]?.error?.includes('Cumulative spending limit exceeded'));

      // Clean up policy
      resetPolicyToDefault();
    });

    // -------------------------------------------------------------------------
    // Test 5: Approved vs Unapproved Purchase Requests
    // -------------------------------------------------------------------------
    await runTest('Test 5: Unapproved requests (draft, pending_approval) cannot check out', async () => {
      resetPurchaseRequests();

      // Attempt checkout on pending_approval request REQ-2026-080
      const pendingRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-080' }),
      });
      assert.equal(pendingRes.status, 400);
      const pendingData = await pendingRes.json() as { error: string };
      assert.equal(pendingData.error, 'AWAITING_APPROVAL');

      // Attempt checkout on draft request REQ-2026-078
      const draftRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-078' }),
      });
      assert.equal(draftRes.status, 400);
      const draftData = await draftRes.json() as { error: string };
      assert.equal(draftData.error, 'DRAFT_STATUS');
    });

    // -------------------------------------------------------------------------
    // Test 6: Unapproved Suppliers are BLOCKED
    // -------------------------------------------------------------------------
    await runTest('Test 6: Request from unapproved supplier is strictly BLOCKED', () => {
      const strictPolicy = {
        ...getActivePolicy(),
        approvedSuppliers: ['Kinetic Workspaces Ltd. (Demo Supplier)'],
      };

      // CAT-101 supplier is Apex Business Hardware
      const result = evaluatePurchasingPolicy(
        { catalogItemId: 'CAT-101', quantity: 1 },
        strictPolicy
      );

      assert.equal(result.decision, 'BLOCKED');
      const supplierRule = result.rules.find((r) => r.ruleId === 'APPROVED_SUPPLIER_CHECK');
      assert.ok(supplierRule);
      assert.equal(supplierRule.status, 'FAILED');
    });

    // -------------------------------------------------------------------------
    // Test 7: Order quantity limit violations are BLOCKED
    // -------------------------------------------------------------------------
    await runTest('Test 7: Order quantity exceeding limit (250 units) is BLOCKED', () => {
      const result = evaluatePurchasingPolicy({
        catalogItemId: 'CAT-102',
        quantity: 300,
      });

      assert.equal(result.decision, 'BLOCKED');
      const qtyRule = result.rules.find((r) => r.ruleId === 'QUANTITY_LIMIT_CHECK');
      assert.ok(qtyRule);
      assert.equal(qtyRule.status, 'FAILED');
    });

    // -------------------------------------------------------------------------
    // Test 8: Budget Reservation & Release Cycle
    // -------------------------------------------------------------------------
    await runTest('Test 8: Budget reservation increases on approval and is released on cancellation', async () => {
      resetPurchaseRequests();
      resetPolicyToDefault();

      const initialSummary = getSpendGuardSummary();
      const initialReserved = initialSummary.reservedSpending;

      // Create a pending request
      const req = setPurchaseRequest({
        id: 'REQ-RESERVE-001',
        title: 'Reservation Cycle Test',
        category: 'IT & Hardware',
        prompt: 'Monitor for reservation lifecycle',
        budgetLimit: 600,
        quantity: 1, // CAT-101 = $529.00
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

      // Approve via atomic approval
      const approveRes = await atomicApproveRequest(req.id);
      assert.equal(approveRes.success, true);

      // Verify reserved budget increased by exactly $529.00
      const reservedSummary = getSpendGuardSummary();
      assert.equal(
        reservedSummary.reservedSpending,
        Number((initialReserved + 529.0).toFixed(2)),
        'Reserved spending must increase by request total upon approval'
      );

      // Cancel the request
      const cancelRes = await fetch(`${baseUrl}/api/requests/REQ-RESERVE-001/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      assert.equal(cancelRes.status, 200);

      // Verify reservation is released immediately back to original level
      const postCancelSummary = getSpendGuardSummary();
      assert.equal(
        postCancelSummary.reservedSpending,
        initialReserved,
        'Reservation must be released back to initial level after cancellation'
      );
    });

    // -------------------------------------------------------------------------
    // Test 9: Cancelled or Rejected Requests Cannot Be Checked Out
    // -------------------------------------------------------------------------
    await runTest('Test 9: Cancelled request cannot be paid or checked out', async () => {
      // REQ-RESERVE-001 is cancelled
      const res = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-RESERVE-001' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'CANCELLED_STATUS');
    });

    // -------------------------------------------------------------------------
    // Test 10: Successful PayPal Capture & Verified Payment Accounting
    // -------------------------------------------------------------------------
    await runTest('Test 10: Successful PayPal capture transitions status to paid and updates accounting', async () => {
      resetPurchaseRequests();
      setPayPalTransportMock(mockPayPalTransport(1058.0));

      // REQ-2026-081 is approved with authoritative total $1058.00
      const createOrderRes = await fetch(`${baseUrl}/api/checkout/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081' }),
      });
      assert.equal(createOrderRes.status, 200);
      const orderData = await createOrderRes.json() as { orderId: string };
      assert.equal(orderData.orderId, MOCK_ORDER_ID);

      const beforeCaptureSummary = getSpendGuardSummary();
      const beforePaid = beforeCaptureSummary.paidSpending;

      // Execute capture
      const captureRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId: MOCK_ORDER_ID }),
      });
      assert.equal(captureRes.status, 200);
      const captureData = await captureRes.json() as { status: string; purchase: { status: string; paymentDetails: { captureId: string } } };
      assert.equal(captureData.status, 'COMPLETED');
      assert.equal(captureData.purchase.status, 'paid');
      assert.equal(captureData.purchase.paymentDetails.captureId, MOCK_CAPTURE_ID);

      // Verify that paid spending increased and request is no longer counted as reserved
      const afterCaptureSummary = getSpendGuardSummary();
      assert.equal(
        afterCaptureSummary.paidSpending,
        Number((beforePaid + 1058.0).toFixed(2)),
        'Paid spending must increase by exactly the captured order total'
      );
    });

    // -------------------------------------------------------------------------
    // Test 11: Duplicate Capture Prevention
    // -------------------------------------------------------------------------
    await runTest('Test 11: Duplicate capture request returns 409 and maintains pristine record', async () => {
      // REQ-2026-081 is already captured and paid from Test 10
      const dupRes = await fetch(`${baseUrl}/api/checkout/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: 'REQ-2026-081', orderId: MOCK_ORDER_ID }),
      });
      assert.equal(dupRes.status, 409);
      const dupData = await dupRes.json() as { error: string };
      assert.equal(dupData.error, 'ALREADY_PAID');
    });

    // -------------------------------------------------------------------------
    // Test 12: Dashboard Summary Matches Authoritative Backend Records
    // -------------------------------------------------------------------------
    await runTest('Test 12: GET /api/spendguard/summary matches authoritative backend records', async () => {
      const summaryRes = await fetch(`${baseUrl}/api/spendguard/summary`);
      assert.equal(summaryRes.status, 200);
      const body = await summaryRes.json() as { success: boolean; data: ReturnType<typeof getSpendGuardSummary> };
      assert.equal(body.success, true);

      const all = getAllPurchaseRequests();
      const paidSum = Number(
        all.filter((r) => r.status === 'paid').reduce((s, r) => s + r.authoritativeTotal, 0).toFixed(2)
      );

      assert.equal(body.data.paidSpending, paidSum);
      assert.equal(
        body.data.totalCommitted,
        Number((body.data.paidSpending + body.data.reservedSpending).toFixed(2))
      );
      assert.ok(body.data.utilizationPercent >= 0 && body.data.utilizationPercent <= 100);
    });

    // -------------------------------------------------------------------------
    // Test 13: Policy Persistence across Backend Restarts
    // -------------------------------------------------------------------------
    await runTest('Test 13: PUT /api/policies/current updates settings and persists', async () => {
      const updatePayload = {
        departmentName: 'Fintech Operations & Logistics',
        cumulativeBudgetLimit: 35000.0,
        budgetAlertThresholdPercent: 85,
        maxSingleOrderBudget: 12000.0,
      };

      const putRes = await fetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
        },
        body: JSON.stringify(updatePayload),
      });

      assert.equal(putRes.status, 200);
      const putData = await putRes.json() as { data: { departmentName: string; cumulativeBudgetLimit: number } };
      assert.equal(putData.data.departmentName, 'Fintech Operations & Logistics');
      assert.equal(putData.data.cumulativeBudgetLimit, 35000.0);

      // Verify active policy on server reflects change
      const active = getActivePolicy();
      assert.equal(active.departmentName, 'Fintech Operations & Logistics');
      assert.equal(active.cumulativeBudgetLimit, 35000.0);

      // Reset back to defaults for clean test state
      resetPolicyToDefault();
    });

    // -------------------------------------------------------------------------
    // Test 14: Security — Unauthorized users cannot modify policy settings
    // -------------------------------------------------------------------------
    await runTest('Test 14: Unauthorized requester role cannot update spending policy (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/api/policies/current`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'employee',
        },
        body: JSON.stringify({ cumulativeBudgetLimit: 999999 }),
      });

      assert.equal(res.status, 403);
      const data = await res.json() as { error: string };
      assert.equal(data.error, 'FORBIDDEN');
    });

    // -------------------------------------------------------------------------
    // Test 15: Security — Cannot mark purchase as paid via PATCH
    // -------------------------------------------------------------------------
    await runTest('Test 15: Security forbids marking purchase as paid via PATCH status (HTTP 403)', async () => {
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
  console.log(`SpendGuard Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('SpendGuard test execution error:', err);
  process.exit(1);
});
