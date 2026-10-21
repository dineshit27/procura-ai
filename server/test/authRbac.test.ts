import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { createRequireAuth, requirePermission, type AuthClients, type Permission, type UserRole } from '../src/middleware/auth.js';
import { assignInitialAdmin, InitialAdminSetupError } from '../src/services/initialAdminSetup.js';

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

console.log(`Auth/RBAC tests: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error('Auth/RBAC test runner failed.', error);
  process.exitCode = 1;
});
