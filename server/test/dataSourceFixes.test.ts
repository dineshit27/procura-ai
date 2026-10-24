import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { CATALOG_ITEMS } from '../src/data/catalog.js';
import { resetPurchaseRequests, getAllPurchaseRequests } from '../src/data/purchaseRequests.js';
import { getSpendGuardSummary } from '../src/services/spendGuardService.js';
import { Server } from 'node:http';
import { setAuthClientsForTests, type AuthClients } from '../src/middleware/auth.js';

console.log('🧪 Starting Procura AI Data-Source Fixes Test Suite...\n');

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

// Tests use the same verified-token and server-side role-resolution seam as
// production. This injection is rejected outside NODE_ENV=test.
setAuthClientsForTests(() => ({
  publicClient: {
    auth: { getUser: async () => ({ data: { user: { id: 'datasource-admin', email: 'admin@example.com' } }, error: null }) },
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
  headers.set('Authorization', 'Bearer datasource-test-access-token');
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

async function runAllTests(): Promise<void> {
  await startServer();

  try {
    // -------------------------------------------------------------------------
    // Test 1: GET /api/catalog returns all authoritative catalog items
    // -------------------------------------------------------------------------
    await runTest('Test 1: GET /api/catalog returns authoritative catalog with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/catalog`);
      assert.equal(res.status, 200);
      const body = await res.json() as any;
      assert.equal(body.success, true);
      assert.equal(Array.isArray(body.data), true);
      assert.equal(body.data.length, CATALOG_ITEMS.length);
      assert.equal(body.count, CATALOG_ITEMS.length);

      const first = body.data[0];
      assert.ok(first.id, 'id is required');
      assert.ok(first.name, 'name is required');
      assert.ok(typeof first.price === 'number', 'price must be number');
      assert.ok(first.supplier, 'supplier is required');
      assert.ok(first.category, 'category is required');
    });

    // -------------------------------------------------------------------------
    // Test 2: GET /api/catalog/:id returns specific item or 404
    // -------------------------------------------------------------------------
    await runTest('Test 2: GET /api/catalog/:id returns single item (200) and 404 on missing item', async () => {
      const validRes = await fetch(`${baseUrl}/api/catalog/CAT-101`);
      assert.equal(validRes.status, 200);
      const validBody = await validRes.json() as any;
      assert.equal(validBody.success, true);
      assert.equal(validBody.data.id, 'CAT-101');
      assert.equal(validBody.data.price, 529.00);

      const missingRes = await fetch(`${baseUrl}/api/catalog/CAT-NON-EXISTENT`);
      assert.equal(missingRes.status, 404);
      const missingBody = await missingRes.json() as any;
      assert.equal(missingBody.success, false);
      assert.equal(missingBody.error, 'NOT_FOUND');
    });

    // -------------------------------------------------------------------------
    // Test 3: GET /api/spendguard/summary provides live recentActivity
    // -------------------------------------------------------------------------
    await runTest('Test 3: GET /api/spendguard/summary includes live recentActivity array with proper schema', async () => {
      const res = await fetch(`${baseUrl}/api/spendguard/summary`);
      assert.equal(res.status, 200);
      const body = await res.json() as any;
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.recentActivity), 'recentActivity must be an array');

      if (body.data.recentActivity.length > 0) {
        const item = body.data.recentActivity[0];
        assert.ok(item.id, 'id is required on recentActivity item');
        assert.ok(item.title, 'title is required on recentActivity item');
        assert.ok(item.status, 'status is required on recentActivity item');
        assert.ok(typeof item.total === 'number', 'total must be a number on recentActivity item');
        assert.ok(item.timestamp, 'timestamp is required on recentActivity item');
      }
    });

    // -------------------------------------------------------------------------
    // Test 4: Empty purchase requests handling
    // -------------------------------------------------------------------------
    await runTest('Test 4: GET /api/requests returns [] when no requests exist without error', async () => {
      // Save current requests
      const saved = getAllPurchaseRequests();

      try {
        // Reset to empty
        resetPurchaseRequests([]);
        const res = await fetch(`${baseUrl}/api/requests`);
        assert.equal(res.status, 200);
        const body = await res.json() as any;
        assert.equal(body.success, true);
        assert.equal(Array.isArray(body.data), true);
        assert.equal(body.data.length, 0);

        // Verify SpendGuard summary also handles empty requests list cleanly
        const summaryRes = await fetch(`${baseUrl}/api/spendguard/summary`);
        assert.equal(summaryRes.status, 200);
        const summaryBody = await summaryRes.json() as any;
        assert.equal(summaryBody.data.paidSpending, 0);
        assert.equal(summaryBody.data.reservedSpending, 0);
        assert.equal(summaryBody.data.totalCommitted, 0);
        assert.equal(summaryBody.data.recentActivity.length, 0);
      } finally {
        // Restore requests
        resetPurchaseRequests(saved);
      }
    });

  } finally {
    await stopServer();
  }

  console.log('\n========================================');
  console.log(`Data Source Fixes Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
