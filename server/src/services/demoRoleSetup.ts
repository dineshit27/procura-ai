import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserRole } from '../middleware/auth.js';

export class DemoRoleSetupError extends Error {}

export interface DemoRoleAssignment {
  role: UserRole;
  email: string;
}

type ServiceRoleClient = Pick<SupabaseClient, 'from'> & {
  auth: { admin: Pick<SupabaseClient['auth']['admin'], 'listUsers'> };
};

const demoRoleVariables: Array<{ role: UserRole; variable: string }> = [
  { role: 'admin', variable: 'DEMO_ADMIN_EMAIL' },
  { role: 'procurement_manager', variable: 'DEMO_PROCUREMENT_EMAIL' },
  { role: 'finance_manager', variable: 'DEMO_FINANCE_EMAIL' },
  { role: 'requester', variable: 'DEMO_REQUESTER_EMAIL' },
];

/**
 * This is intentionally a server-only, explicit setup operation. Browser
 * values never select a role, and it has no HTTP surface.
 */
export function readDemoRoleAssignments(source: NodeJS.ProcessEnv = process.env): DemoRoleAssignment[] {
  if (source.DEMO_ROLE_SETUP_CONFIRM !== 'assign-demo-roles') {
    throw new DemoRoleSetupError('Set DEMO_ROLE_SETUP_CONFIRM=assign-demo-roles to assign demo roles.');
  }

  return demoRoleVariables.map(({ role, variable }) => {
    const email = source[variable]?.trim().toLowerCase();
    if (!email) throw new DemoRoleSetupError(`${variable} is required.`);
    return { role, email };
  });
}

async function findUsersByEmail(client: ServiceRoleClient, emails: Set<string>): Promise<Map<string, User>> {
  const found = new Map<string, User>();
  let page = 1;

  do {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new DemoRoleSetupError('Unable to look up Supabase demo users.');
    for (const user of data.users) {
      const email = user.email?.toLowerCase();
      if (email && emails.has(email)) found.set(email, user);
    }
    if (data.users.length < 1000 || found.size === emails.size) break;
    page += 1;
  } while (page <= 100);

  return found;
}

export async function assignDemoRoles(
  client: ServiceRoleClient,
  assignments: DemoRoleAssignment[],
): Promise<Array<{ id: string; role: UserRole }>> {
  const users = await findUsersByEmail(client, new Set(assignments.map(({ email }) => email)));
  const missing = assignments.filter(({ email }) => !users.has(email));
  if (missing.length > 0) {
    throw new DemoRoleSetupError(`No Supabase Auth user exists for: ${missing.map(({ role }) => role).join(', ')}.`);
  }

  const unverified = assignments.filter(({ email }) => !users.get(email)?.email_confirmed_at);
  if (unverified.length > 0) {
    throw new DemoRoleSetupError(`Demo users must have verified emails: ${unverified.map(({ role }) => role).join(', ')}.`);
  }

  const rows = assignments.map(({ role, email }) => ({
    id: users.get(email)!.id,
    email,
    role,
  }));
  const { data, error } = await client.from('profiles').upsert(rows).select('id,role');
  if (error || !data || data.length !== rows.length) {
    throw new DemoRoleSetupError('Unable to assign all demo roles. No browser authorization was changed.');
  }

  return data.map((row) => ({ id: row.id, role: row.role as UserRole }));
}
