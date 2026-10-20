import type { SupabaseClient, User } from '@supabase/supabase-js';

type ServiceRoleClient = Pick<SupabaseClient, 'rpc'> & {
  auth: { admin: Pick<SupabaseClient['auth']['admin'], 'listUsers'> };
};

export class InitialAdminSetupError extends Error {}

/**
 * Assigns the one permitted initial admin through the database function that
 * is executable only by Supabase's service_role. This is intentionally not an
 * HTTP endpoint and never accepts browser credentials or a browser-supplied
 * role.
 */
export async function assignInitialAdmin(client: ServiceRoleClient, email: string): Promise<{ id: string; email: string; role: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new InitialAdminSetupError('INITIAL_ADMIN_EMAIL is required.');

  let page = 1;
  let user: User | undefined;
  do {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new InitialAdminSetupError('Unable to look up the Supabase user.');
    user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user || data.users.length < 1000) break;
    page += 1;
  } while (page <= 100);

  if (!user) throw new InitialAdminSetupError('No Supabase user exists for INITIAL_ADMIN_EMAIL.');
  if (!user.email_confirmed_at) throw new InitialAdminSetupError('The selected Supabase user must have a verified email address.');

  const { data, error } = await client.rpc('assign_initial_admin', { target_user_id: user.id });
  if (error || !data) throw new InitialAdminSetupError('Initial administrator assignment was refused. It may already have been completed.');
  const assigned = Array.isArray(data) ? data[0] : data;
  return { id: assigned.id, email: assigned.email, role: assigned.role };
}
