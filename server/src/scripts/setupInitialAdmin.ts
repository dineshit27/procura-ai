import { getAdminClient } from '../middleware/auth.js';
import { assignInitialAdmin, InitialAdminSetupError } from '../services/initialAdminSetup.js';

async function main(): Promise<void> {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  if (process.env.INITIAL_ADMIN_SETUP_CONFIRM !== 'assign-initial-admin') {
    throw new InitialAdminSetupError('Set INITIAL_ADMIN_SETUP_CONFIRM=assign-initial-admin to run this one-time operation.');
  }
  const client = getAdminClient();
  if (!client) throw new InitialAdminSetupError('Supabase server configuration is missing.');
  const assigned = await assignInitialAdmin(client, email || '');
  console.log(`Initial Procura administrator assigned for ${assigned.email} (${assigned.id}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Initial administrator setup failed.');
  process.exitCode = 1;
});
