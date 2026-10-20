import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';

export const ROLES = ['admin', 'procurement_manager', 'finance_manager', 'requester'] as const;
export type UserRole = (typeof ROLES)[number];
export type Permission = 'manage_users' | 'manage_policies' | 'read_financials' | 'approve_requests' | 'create_requests' | 'read_requests' | 'checkout';

type AuthenticatedRequest = Request & { auth?: { userId: string; email?: string; role: UserRole } };

export interface AuthClients {
  publicClient: Pick<SupabaseClient, 'auth'>;
  adminClient: Pick<SupabaseClient, 'from'>;
}

const permissions: Record<UserRole, ReadonlySet<Permission>> = {
  admin: new Set(['manage_users', 'manage_policies', 'read_financials', 'approve_requests', 'create_requests', 'read_requests', 'checkout']),
  procurement_manager: new Set(['approve_requests', 'create_requests', 'read_requests', 'checkout']),
  finance_manager: new Set(['read_financials', 'approve_requests', 'read_requests', 'checkout']),
  requester: new Set(['create_requests', 'read_requests', 'checkout']),
};

function configured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function clients(): AuthClients | null {
  if (!configured()) return null;
  const url = process.env.SUPABASE_URL!;
  return {
    publicClient: createClient(url, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }),
    adminClient: createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

/**
 * Builds verified Supabase/RBAC middleware.  Kept injectable so the security
 * boundary can be exercised without a real Supabase project in tests.
 */
export function createRequireAuth(getClients: () => AuthClients | null = clients) {
  return function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const available = getClients();
  if (!available) {
    res.status(503).json({ error: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured on this server.' });
    return;
  }
  const token = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'A valid access token is required.' });
    return;
  }
  void available.publicClient.auth.getUser(token).then(async ({ data, error }) => {
    if (error || !data.user) {
      res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Access token is invalid or expired.' });
      return;
    }
    const { data: profile, error: profileError } = await available.adminClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) {
      // Do not leak database details, but do distinguish an outage from an
      // absent role so the client never mistakes an authorization failure for
      // live data.
      res.status(503).json({ error: 'ROLE_LOOKUP_UNAVAILABLE', message: 'Role authorization could not be checked. Try again shortly.' });
      return;
    }
    if (!profile || !ROLES.includes(profile.role as UserRole)) {
      res.status(403).json({
        error: 'ROLE_NOT_ASSIGNED',
        message: 'No authorized role assignment was found. Ask a Procura administrator to assign your role.',
      });
      return;
    }
    req.auth = { userId: data.user.id, email: data.user.email, role: profile.role as UserRole };
    next();
  }).catch(() => res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Access token verification failed.' }));
  };
}

export const requireAuth = createRequireAuth();

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !permissions[req.auth.role].has(permission)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

export function canAccessRequest(req: AuthenticatedRequest, ownerId?: string): boolean {
  if (!req.auth) return false;
  if (req.auth.role === 'admin' || req.auth.role === 'procurement_manager' || req.auth.role === 'finance_manager') return true;
  // Legacy records without an owner are intentionally not disclosed to requesters.
  return Boolean(ownerId && ownerId === req.auth.userId);
}

export type AuthedRequest = AuthenticatedRequest;
export function getAdminClient(): SupabaseClient | null { return (clients()?.adminClient as SupabaseClient | undefined) ?? null; }
