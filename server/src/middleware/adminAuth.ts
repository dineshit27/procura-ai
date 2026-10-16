import { Request, Response, NextFunction } from 'express';

/**
 * SECURITY NOTICE — DEVELOPMENT / DEMO AUTHORIZATION ONLY
 *
 * This middleware reads the `x-user-role` HTTP request header and grants or
 * denies access based on an allowlist of privileged role strings in the
 * development and test environments only.
 *
 * ⚠  THIS IS NOT CRYPTOGRAPHIC AUTHENTICATION.
 *
 * Any HTTP client can send `x-user-role: admin` without possessing any
 * credential, token, or session. This header is unauthenticated and trivially
 * spoofable. It is used here solely as a lightweight convention for
 * development demos and hackathon prototypes that do not yet integrate a
 * full identity/auth system (e.g. JWT, session cookies, OAuth2).
 *
 * In production, header-only authorization is rejected because this
 * repository does not yet have a verified credential mechanism. Before
 * production deployment, replace this middleware with a verified
 * mechanism such as:
 *  - Signed JWT bearer tokens (verified with a secret or public key)
 *  - Secure session cookies (HttpOnly, Secure, SameSite=Strict)
 *  - OAuth2 / OIDC access tokens validated against a JWKS endpoint
 *
 * LIMITATION: This check provides ZERO protection against malicious or
 * misconfigured clients. Do not describe it as "secure" or "authenticated"
 * to users or auditors.
 */

/** Roles that are granted access to admin-only policy endpoints. */
const ADMIN_ROLES = new Set(['admin', 'finance_manager', 'finance-manager', 'procurement_manager']);

/**
 * requireAdminRole
 *
 * Reads `x-user-role` from request headers and rejects the request with
 * HTTP 403 if the role is not in the admin allowlist.
 *
 * Any role not explicitly present in ADMIN_ROLES — including absent headers,
 * empty strings, unknown roles, and lowercase/trimmed variants — is denied.
 * This is an allowlist, not a denylist, so unknown/future roles are
 * automatically rejected without code changes.
 *
 * ⚠  See security notice above.  ⚠
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      status: 'error',
      error: 'FORBIDDEN',
      message: 'Administrative policy changes require verified authentication in production.',
      authNote:
        'Production authorization is fail-closed until a verified JWT, session, or OAuth2/OIDC mechanism is configured. ' +
        'The x-user-role header is never accepted as authentication.',
    });
    return;
  }

  const rawRole = req.headers['x-user-role'];
  const role = typeof rawRole === 'string' ? rawRole : '';

  if (!ADMIN_ROLES.has(role)) {
    res.status(403).json({
      status: 'error',
      error: 'FORBIDDEN',
      message:
        'Unauthorized: Only designated Procurement or Finance Administrators may perform this action. ' +
        'Provide a valid x-user-role header (admin | finance_manager | procurement_manager).',
      authNote:
        'DEMO ONLY — x-user-role header authorization is not cryptographically verified. ' +
        'Replace with JWT/session auth before any production deployment.',
    });
    return;
  }

  next();
}
