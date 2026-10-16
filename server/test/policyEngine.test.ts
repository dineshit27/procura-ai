import assert from 'node:assert/strict';
import { evaluatePurchasingPolicy } from '../src/services/policyEngine.js';
import { DEFAULT_PROCUREMENT_POLICY, ServerProcurementPolicy } from '../src/config/policySettings.js';
import { policyEvaluationRequestSchema } from '../src/types/policy.js';

console.log('🧪 Starting Procura AI Policy Engine Test Suite...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: A valid purchase under all limits
// -----------------------------------------------------------------------------
runTest('Test 1: Valid purchase under all limits (auto-approval eligible)', () => {
  // CAT-102 is $99.00. 2 units = $198.00 <= $500.00 autoApproveThreshold
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'CAT-102',
    quantity: 2,
    userSpecifiedBudget: 300,
  });

  assert.equal(result.decision, 'ALLOWED', 'Decision should be ALLOWED');
  assert.equal(result.requiresHumanApproval, false, 'Should not require human approval');
  assert.equal(result.itemizedCost.authoritativeUnitPrice, 99.0);
  assert.equal(result.itemizedCost.subtotal, 198.0);
  assert.equal(result.rules.every((r) => r.status === 'PASSED'), true, 'All rules should pass');
});

// -----------------------------------------------------------------------------
// Test 2: A purchase exceeding the maximum order budget
// -----------------------------------------------------------------------------
runTest('Test 2: Purchase exceeding the maximum order budget is BLOCKED', () => {
  // CAT-104 is $1195.00. 9 units = $10,755.00 > $10,000.00 maxSingleOrderBudget
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'CAT-104',
    quantity: 9,
  });

  assert.equal(result.decision, 'BLOCKED', 'Decision should be BLOCKED');
  assert.equal(result.requiresHumanApproval, false, 'Blocked purchases cannot be sent for approval');
  assert.equal(result.itemizedCost.subtotal, 10755.0);
  const maxBudgetRule = result.rules.find((r) => r.ruleId === 'MAX_SINGLE_ORDER_BUDGET');
  assert.ok(maxBudgetRule, 'MAX_SINGLE_ORDER_BUDGET rule must exist');
  assert.equal(maxBudgetRule.status, 'FAILED', 'MAX_SINGLE_ORDER_BUDGET must fail');
});

// -----------------------------------------------------------------------------
// Test 3: A purchase exceeding the approval cap
// -----------------------------------------------------------------------------
runTest('Test 3: Purchase exceeding approval cap triggers NEEDS_APPROVAL', () => {
  // CAT-101 is $529.00. 2 units = $1058.00 > $500 autoApproveThreshold, but < $10,000 maxSingleOrderBudget
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'CAT-101',
    quantity: 2,
  });

  assert.equal(result.decision, 'NEEDS_APPROVAL', 'Decision should be NEEDS_APPROVAL');
  assert.equal(result.requiresHumanApproval, true, 'Must require human approval');
  assert.equal(result.itemizedCost.subtotal, 1058.0);
  const thresholdRule = result.rules.find((r) => r.ruleId === 'AUTO_APPROVAL_THRESHOLD');
  assert.ok(thresholdRule, 'AUTO_APPROVAL_THRESHOLD rule must exist');
  assert.equal(thresholdRule.status, 'FLAGGED', 'AUTO_APPROVAL_THRESHOLD must be flagged');
});

// -----------------------------------------------------------------------------
// Test 4: An unapproved supplier
// -----------------------------------------------------------------------------
runTest('Test 4: Purchase with an unapproved supplier is BLOCKED', () => {
  // Custom policy that only approves Kinetic Workspaces
  const strictPolicy: ServerProcurementPolicy = {
    ...DEFAULT_PROCUREMENT_POLICY,
    approvedSuppliers: ['Kinetic Workspaces Ltd. (Demo Supplier)'],
  };

  // CAT-101 is supplied by Apex Business Hardware (unapproved under this policy)
  const result = evaluatePurchasingPolicy(
    {
      catalogItemId: 'CAT-101',
      quantity: 1,
    },
    strictPolicy
  );

  assert.equal(result.decision, 'BLOCKED', 'Decision should be BLOCKED');
  const supplierRule = result.rules.find((r) => r.ruleId === 'APPROVED_SUPPLIER_CHECK');
  assert.ok(supplierRule, 'APPROVED_SUPPLIER_CHECK rule must exist');
  assert.equal(supplierRule.status, 'FAILED', 'APPROVED_SUPPLIER_CHECK must fail');
  assert.ok(
    result.reasons.some((r) => r.includes('unapproved')),
    'Reason must mention unapproved supplier'
  );
});

// -----------------------------------------------------------------------------
// Test 5: Unavailable or unknown product
// -----------------------------------------------------------------------------
runTest('Test 5a: Unknown product ID is BLOCKED', () => {
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'NON_EXISTENT_ITEM_XYZ',
    quantity: 1,
  });

  assert.equal(result.decision, 'BLOCKED', 'Decision should be BLOCKED');
  const productRule = result.rules.find((r) => r.ruleId === 'CATALOG_PRODUCT_VALIDATION');
  assert.ok(productRule, 'CATALOG_PRODUCT_VALIDATION rule must exist');
  assert.equal(productRule.status, 'FAILED', 'Product validation must fail');
});

runTest('Test 5b: Quantity exceeding supplier warehouse stock is BLOCKED', () => {
  // CAT-104 has stockUnits: 9. Requesting 15 units.
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'CAT-104',
    quantity: 15,
  });

  assert.equal(result.decision, 'BLOCKED', 'Decision should be BLOCKED');
  const stockRule = result.rules.find((r) => r.ruleId === 'CATALOG_STOCK_VALIDATION');
  assert.ok(stockRule, 'CATALOG_STOCK_VALIDATION rule must exist');
  assert.equal(stockRule.status, 'FAILED', 'Stock validation must fail');
});

// -----------------------------------------------------------------------------
// Test 6: Invalid quantity and tampered price/total input
// -----------------------------------------------------------------------------
runTest('Test 6a: Zod rejects invalid quantity (0, negative, non-integer)', () => {
  const res1 = policyEvaluationRequestSchema.safeParse({ catalogItemId: 'CAT-101', quantity: 0 });
  assert.equal(res1.success, false, 'Quantity 0 must be rejected');

  const res2 = policyEvaluationRequestSchema.safeParse({ catalogItemId: 'CAT-101', quantity: -3 });
  assert.equal(res2.success, false, 'Negative quantity must be rejected');

  const res3 = policyEvaluationRequestSchema.safeParse({ catalogItemId: 'CAT-101', quantity: 1.5 });
  assert.equal(res3.success, false, 'Floating point quantity must be rejected');
});

runTest('Test 6b: Server computes authoritative price and ignores tampered client input', () => {
  // Even if an attacker passes forged price/total in request payload:
  const tamperedPayload = {
    catalogItemId: 'CAT-101', // Authoritative price is $529.00
    quantity: 2,
    // Attempted tampering:
    unitPrice: 1.0,
    subtotal: 2.0,
    total: 2.0,
  };

  const parsed = policyEvaluationRequestSchema.parse(tamperedPayload);
  const result = evaluatePurchasingPolicy(parsed);

  // Server must strictly use $529.00 * 2 = $1058.00, NOT the fake $2.00
  assert.equal(result.itemizedCost.authoritativeUnitPrice, 529.0);
  assert.equal(result.itemizedCost.subtotal, 1058.0);
  assert.equal(result.decision, 'NEEDS_APPROVAL');
});

// -----------------------------------------------------------------------------
// Test 7: Missing or invalid policy settings
// -----------------------------------------------------------------------------
runTest('Test 7: Missing or invalid policy configuration throws fail-safe error', () => {
  assert.throws(
    () => {
      // @ts-expect-error Testing missing policy
      evaluatePurchasingPolicy({ catalogItemId: 'CAT-101', quantity: 1 }, null);
    },
    /Policy configuration is missing or invalid/,
    'Must throw fail-safe error'
  );
});

// -----------------------------------------------------------------------------
// Test 8: A purchase requiring human approval
// -----------------------------------------------------------------------------
runTest('Test 8: Purchase requiring human approval cannot bypass review', () => {
  // CAT-103 is $489.00. 1 unit = $489 <= $500 threshold, but user target budget is $400.
  // Over user budget triggers human review!
  const result = evaluatePurchasingPolicy({
    catalogItemId: 'CAT-103',
    quantity: 1,
    userSpecifiedBudget: 400.0,
  });

  assert.equal(result.decision, 'NEEDS_APPROVAL', 'Exceeding target budget triggers NEEDS_APPROVAL');
  assert.equal(result.requiresHumanApproval, true, 'Must require human approval');
  const userBudgetRule = result.rules.find((r) => r.ruleId === 'USER_TARGET_BUDGET');
  assert.ok(userBudgetRule);
  assert.equal(userBudgetRule.status, 'FLAGGED');
});

// -----------------------------------------------------------------------------
// Test 9 & 10: Express HTTP Endpoint Integration Tests
// -----------------------------------------------------------------------------
async function runAsyncTests() {
  const { createServer } = await import('../src/server.js');
  const app = createServer();
  const server = app.listen(5119);

  try {
    // Test 9: HTTP POST /api/policies/evaluate
    await new Promise<void>((resolve, reject) => {
      runTest('Test 9: HTTP POST /api/policies/evaluate returns typed policy decision', () => {
        (async () => {
          const res = await fetch('http://127.0.0.1:5119/api/policies/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              catalogItemId: 'CAT-102',
              quantity: 1,
            }),
          });

          assert.equal(res.status, 200);
          const body = await res.json();
          assert.equal(body.status, 'success');
          assert.equal(body.data.decision, 'ALLOWED');
          assert.equal(body.data.itemizedCost.subtotal, 99.0);
          assert.ok(body.data.rules.length >= 4);
        })().then(resolve).catch(reject);
      });
    });

    // Test 10: HTTP GET /api/policies/current
    await new Promise<void>((resolve, reject) => {
      runTest('Test 10: HTTP GET /api/policies/current returns active policy metadata', () => {
        (async () => {
          const res = await fetch('http://127.0.0.1:5119/api/policies/current');
          assert.equal(res.status, 200);
          const body = await res.json();
          assert.equal(body.status, 'success');
          assert.equal(body.data.maxSingleOrderBudget, 10000);
          assert.equal(body.meta.storage, 'development-in-memory');
        })().then(resolve).catch(reject);
      });
    });
  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAsyncTests().catch((err) => {
  console.error('Async test execution error:', err);
  process.exit(1);
});
