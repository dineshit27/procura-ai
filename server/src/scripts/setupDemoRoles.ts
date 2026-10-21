// Load and validate the server environment before resolving the service-role
// client.  This script is run directly (outside the HTTP server), so it does
// not otherwise import the configuration module that loads server/.env.
import '../config/env.js';
import { getAdminClient } from '../middleware/auth.js';
import { assignDemoRoles, readDemoRoleAssignments } from '../services/demoRoleSetup.js';

async function main(): Promise<void> {
  const client = getAdminClient();
  if (!client) throw new Error('Supabase server configuration is missing.');
  const assigned = await assignDemoRoles(client, readDemoRoleAssignments());
  console.log(`Assigned server-side roles for ${assigned.length} configured demo users: ${assigned.map(({ role }) => role).join(', ')}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo role setup failed.');
  process.exitCode = 1;
});
