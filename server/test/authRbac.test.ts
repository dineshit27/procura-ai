import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { ROLES, canAccessRequest, createRequireAuth, requirePermission, type AuthClients, type Permission, type UserRole } from '../src/middleware/auth.js';
import { assignInitialAdmin, InitialAdminSetupError } from '../src/services/initialAdminSetup.js';
import { assignDemoRoles, DemoRoleSetupError, readDemoRoleAssignments } from '../src/services/demoRoleSetup.js';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); console.log(`  PASS ${name}`); passed++; }
  catch (error) { console.error(`  FAIL ${name}`, error); failed++; }
}

function authClients(profile: unknown, tokenUser: { id: string; email?: string } | null, tokenError: unknown = null): AuthClients {
  return {
    publicClient: { auth: { getUser: async () => ({ data: { user: tokenUser }, error: tokenError }) } } as AuthClients['publicClient']['auth'],
    adminClient: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
      }),
    } as AuthClients['adminClient'],
  };
}

async function invoke(clients: AuthClients | null, authorization?: string): Promise<{ status: number; body: unknown; next: boolean }> {
  const middleware = createRequireAuth(() => clients);
  let status = 200;
  let body: unknown;
  let next = false;
  const req = { header: (name: string) => name === 'authorization' ? authorization : undefined } as Request;
  const res = { status: (code: number) => { status = code; return res; }, json: (value: unknown) => { body = value; return res; } } as unknown as Response;
  await new Promise<void>((resolve) => {
    middleware(req as never, res, (() => { next = true; resolve(); }) as NextFunction);
    setTimeout(resolve, 20);
  });
  return { status, body, next };
}

async function main(): Promise<void> {
await runTest('missing role assignment is forbidden with an actionable error', async () => {
  const result = await invoke(authClients(null, { id: 'user-1', email: 'admin@example.com' }), 'Bearer valid-token');
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: 'ROLE_NOT_ASSIGNED', message: 'No authorized role assignment was found. Ask a Procura administrator to assign your role.' });
  assert.equal(result.next, false);
});

await runTest('valid server-side role assignment authorizes the request', async () => {
  const result = await invoke(authClients({ role: 'admin' }, { id: 'user-1', email: 'admin@example.com' }), 'Bearer valid-token');
  assert.equal(result.status, 200);
  assert.equal(result.next, true);
});

await runTest('each trusted role assignment authorizes its verified Supabase user', async () => {
  for (const role of ROLES) {
    const result = await invoke(authClients({ role }, { id: `${role}-id`, email: `${role}@example.com` }), 'Bearer valid-token');
    assert.equal(result.status, 200, `${role} should be authorized`);
    assert.equal(result.next, true, `${role} should advance to the protected route`);
  }
});

await runTest('an unrecognized stored role is forbidden', async () => {
  const result = await invoke(authClients({ role: 'superuser' }, { id: 'user-1' }), 'Bearer valid-token');
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: 'ROLE_NOT_ASSIGNED', message: 'No authorized role assignment was found. Ask a Procura administrator to assign your role.' });
  assert.equal(result.next, false);
});

await runTest('missing or invalid access tokens are unauthorized', async () => {
  const missing = await invoke(authClients({ role: 'admin' }, { id: 'user-1' }));
  assert.equal(missing.status, 401);
  const invalid = await invoke(authClients({ role: 'admin' }, null, { message: 'invalid' }), 'Bearer invalid-token');
  assert.equal(invalid.status, 401);
});

await runTest('a forged x-user-role header cannot add an admin permission', async () => {
  let advanced = false;
  const req = { auth: { userId: 'requester-1', role: 'requester' }, headers: { 'x-user-role': 'admin' } } as unknown as Request;
  const res = { status: () => res, json: () => res } as unknown as Response;
  requirePermission('manage_users')(req as never, res, (() => { advanced = true; }) as NextFunction);
  assert.equal(advanced, false);
});

await runTest('the requester role cannot approve requests', async () => {
  let advanced = false;
  const req = { auth: { userId: 'requester-1', role: 'requester' } } as unknown as Request;
  const res = { status: () => res, json: () => res } as unknown as Response;
  requirePermission('approve_requests')(req as never, res, (() => { advanced = true; }) as NextFunction);
  assert.equal(advanced, false);
});

await runTest('a requester demo session is isolated to requests it owns', async () => {
  const requester = { auth: { userId: 'demo-requester', role: 'requester' as const } } as Request;
  assert.equal(canAccessRequest(requester as never, 'demo-requester'), true);
  assert.equal(canAccessRequest(requester as never, 'another-demo-user'), false);

  const administrator = { auth: { userId: 'demo-admin', role: 'admin' as const } } as Request;
  assert.equal(canAccessRequest(administrator as never, 'another-demo-user'), true);
});

await runTest('each supported role has only its intended permissions', async () => {
  const expected: Record<UserRole, Permission[]> = {
    admin: ['manage_users', 'manage_policies', 'read_financials', 'approve_requests', 'create_requests', 'read_requests', 'checkout'],
    procurement_manager: ['approve_requests', 'create_requests', 'read_requests', 'checkout'],
    finance_manager: ['read_financials', 'approve_requests', 'read_requests', 'checkout'],
    requester: ['create_requests', 'read_requests', 'checkout'],
  };
  const permissions: Permission[] = ['manage_users', 'manage_policies', 'read_financials', 'approve_requests', 'create_requests', 'read_requests', 'checkout'];

  for (const [role, allowed] of Object.entries(expected) as [UserRole, Permission[]][]) {
    for (const permission of permissions) {
      let advanced = false;
      const req = { auth: { userId: `${role}-1`, role } } as unknown as Request;
      const res = { status: () => res, json: () => res } as unknown as Response;
      requirePermission(permission)(req as never, res, (() => { advanced = true; }) as NextFunction);
      assert.equal(advanced, allowed.includes(permission), `${role} ${permission}`);
    }
  }
});

await runTest('initial admin setup requires a verified existing user and calls only the service RPC', async () => {
  let rpcName = '';
  let rpcArgs: unknown;
  const client = {
    auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'user-1', email: 'admin@example.com', email_confirmed_at: '2026-10-20T00:00:00Z' }] }, error: null }) } },
    rpc: async (name: string, args: unknown) => { rpcName = name; rpcArgs = args; return { data: { id: 'user-1', email: 'admin@example.com', role: 'admin' }, error: null }; },
  };
  const assigned = await assignInitialAdmin(client as never, 'ADMIN@example.com');
  assert.equal(rpcName, 'assign_initial_admin');
  assert.deepEqual(rpcArgs, { target_user_id: 'user-1' });
  assert.deepEqual(assigned, { id: 'user-1', email: 'admin@example.com', role: 'admin' });
});

await runTest('initial admin setup rejects unverified users before role assignment', async () => {
  const client = {
    auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'user-1', email: 'admin@example.com', email_confirmed_at: null }] }, error: null }) } },
    rpc: async () => { throw new Error('must not be called'); },
  };
  await assert.rejects(() => assignInitialAdmin(client as never, 'admin@example.com'), InitialAdminSetupError);
});

await runTest('initial admin setup does not assign a nonexistent user', async () => {
  const client = {
    auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
    rpc: async () => { throw new Error('must not be called'); },
  };
  await assert.rejects(() => assignInitialAdmin(client as never, 'missing@example.com'), InitialAdminSetupError);
});

await runTest('demo role bootstrap writes only explicit verified Auth UUID assignments', async () => {
  const assignments = [
    { role: 'admin' as const, email: 'admin@example.com' },
    { role: 'procurement_manager' as const, email: 'procurement@example.com' },
    { role: 'finance_manager' as const, email: 'finance@example.com' },
    { role: 'requester' as const, email: 'requester@example.com' },
  ];
  let written: Array<{ id: string; email: string; role: UserRole }> = [];
  const client = {
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: assignments.map(({ email, role }) => ({
              id: `${role}-uuid`, email, email_confirmed_at: '2026-10-21T00:00:00Z',
            })),
          },
          error: null,
        }),
      },
    },
    from: () => ({
      upsert: (rows: Array<{ id: string; email: string; role: UserRole }>) => {
        written = rows;
        return { select: async () => ({ data: rows.map(({ id, role }) => ({ id, role })), error: null }) };
      },
    }),
  };
  const result = await assignDemoRoles(client as never, assignments);
  assert.deepEqual(written, assignments.map(({ email, role }) => ({ id: `${role}-uuid`, email, role })));
  assert.deepEqual(result, assignments.map(({ role }) => ({ id: `${role}-uuid`, role })));
});

await runTest('demo role bootstrap requires its explicit one-time confirmation', async () => {
  assert.throws(() => readDemoRoleAssignments({}), DemoRoleSetupError);
});

await runTest('public signup migration defaults every new profile to requester and ignores conflicts', async () => {
  const migration = readFileSync(resolve(process.cwd(), '../supabase/migrations/20261024_public_signup_requester_profile.sql'), 'utf8');
  assert.match(migration, /values\s*\(new\.id,\s*coalesce\(new\.email,\s*''\),\s*'requester'\)/i);
  assert.match(migration, /on conflict\s*\(id\)\s*do nothing/i);
  assert.doesNotMatch(migration, /new\.raw_user_meta_data.*role/i);
});

// ---------------------------------------------------------------------------
// Regression tests for the token-expiry authentication bug
// ---------------------------------------------------------------------------

await runTest('expired or invalid token returns 401 UNAUTHENTICATED (not 403)', async () => {
  // Simulate Supabase rejecting the token (e.g. expired JWT)
  const expiredTokenError = { message: 'Invalid JWT', status: 401 };
  const result = await invoke(
    authClients({ role: 'admin' }, null, expiredTokenError),
    'Bearer expired-or-invalid-token'
  );
  assert.equal(result.status, 401, 'expired token must return 401, not 403');
  assert.ok(result.body && typeof result.body === 'object', 'body must be an object');
  assert.equal((result.body as Record<string, unknown>).error, 'UNAUTHENTICATED');
  assert.equal(result.next, false);
});

await runTest('a request with no Authorization header returns 401 before any profile lookup', async () => {
  // No Authorization header — profile lookup must never be reached
  let profileLookupCalled = false;
  const clientsWithSpy: AuthClients = {
    publicClient: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as AuthClients['publicClient']['auth'],
    adminClient: {
      from: () => {
        profileLookupCalled = true;
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      },
    } as AuthClients['adminClient'],
  };
  const result = await invoke(clientsWithSpy, undefined /* no Authorization header */);
  assert.equal(result.status, 401);
  assert.equal((result.body as Record<string, unknown>).error, 'UNAUTHENTICATED');
  assert.equal(profileLookupCalled, false, 'profile table must not be queried when no token is present');
  assert.equal(result.next, false);
});

await runTest('role mismatch (valid token, wrong role in profiles) returns 403 ROLE_NOT_ASSIGNED', async () => {
  // Token is valid but the profile has no recognized role
  const result = await invoke(
    authClients({ role: 'legacy_user' /* unrecognized */ }, { id: 'user-2', email: 'legacy@example.com' }),
    'Bearer valid-token'
  );
  assert.equal(result.status, 403, 'unrecognized stored role must return 403, not 401');
  assert.equal((result.body as Record<string, unknown>).error, 'ROLE_NOT_ASSIGNED');
  assert.equal(result.next, false);
});

await runTest('session restoration: token verified after simulated browser refresh succeeds', async () => {
  // After a page reload the token is re-read from storage and validated fresh
  // The middleware must NOT rely on in-memory session state — it calls getUser() each time
  const freshTokenUser = { id: 'restored-user', email: 'restored@example.com' };
  for (const role of ROLES) {
    const result = await invoke(
      authClients({ role }, freshTokenUser),
      'Bearer restored-session-token'
    );
    assert.equal(result.status, 200, `Restored ${role} session must be accepted`);
    assert.equal(result.next, true, `Restored ${role} session must advance to the route`);
  }
});

await runTest('authenticated request with valid token returns req.auth with server-verified role', async () => {
  // Confirms that req.auth.role comes from the profiles table, never from the token payload.
  // The middleware is async (calls getUser then adminClient.from), so we use a dedicated
  // Promise that resolves only when next() fires — avoiding a 20 ms timeout race.
  const middleware = createRequireAuth(() => authClients({ role: 'finance_manager' }, { id: 'fin-1', email: 'fin@example.com' }));
  const mutatedReq = { header: (name: string) => name === 'authorization' ? 'Bearer valid-token' : undefined } as Request;
  const res = { status: (_c: number) => res, json: (_v: unknown) => res } as unknown as Response;
  let nextCalled = false;
  await new Promise<void>((resolve, reject) => {
    const next: NextFunction = () => { nextCalled = true; resolve(); };
    middleware(mutatedReq as never, res, next);
    // Safety timeout: if next() is never called in 500 ms the test fails
    setTimeout(() => reject(new Error('middleware did not call next() within 500 ms')), 500);
  });
  assert.equal(nextCalled, true, 'next() must be called for valid authenticated requests');
  const auth = (mutatedReq as never as { auth: { userId: string; email?: string; role: string } }).auth;
  assert.ok(auth, 'req.auth must be set on the mutated request object');
  assert.equal(auth.userId, 'fin-1');
  assert.equal(auth.role, 'finance_manager');
});

await runTest('503 AUTH_NOT_CONFIGURED when Supabase clients are unavailable', async () => {
  // Guards the case where server env vars are missing (not a token error)
  const result = await invoke(null /* no clients */, 'Bearer some-token');
  assert.equal(result.status, 503);
  assert.equal((result.body as Record<string, unknown>).error, 'AUTH_NOT_CONFIGURED');
  assert.equal(result.next, false);
});

await runTest('admin role can access requests owned by any user (no RLS isolation)', async () => {
  const admin = { auth: { userId: 'admin-id', role: 'admin' as const } } as Request;
  assert.equal(canAccessRequest(admin as never, 'another-user-id'), true);
  assert.equal(canAccessRequest(admin as never, undefined), true);
});

await runTest('finance_manager and procurement_manager can access all requests', async () => {
  for (const role of ['finance_manager', 'procurement_manager'] as const) {
    const req = { auth: { userId: `${role}-id`, role } } as Request;
    assert.equal(canAccessRequest(req as never, 'someone-elses-id'), true, `${role} should see all requests`);
    assert.equal(canAccessRequest(req as never, undefined), true, `${role} should see unowned requests`);
  }
});

await runTest('requester is isolated: only owns requests with matching ownerId', async () => {
  const req = { auth: { userId: 'requester-123', role: 'requester' as const } } as Request;
  assert.equal(canAccessRequest(req as never, 'requester-123'), true, 'requester sees their own request');
  assert.equal(canAccessRequest(req as never, 'other-requester'), false, 'requester cannot see another user request');
  assert.equal(canAccessRequest(req as never, undefined), false, 'requester cannot see unowned legacy requests');
});

console.log(`Auth/RBAC tests: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error('Auth/RBAC test runner failed.', error);
  process.exitCode = 1;
});
