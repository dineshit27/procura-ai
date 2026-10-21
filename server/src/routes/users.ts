import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthedRequest, getAdminClient, requireAuth, requirePermission, ROLES } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requirePermission('manage_users'));

usersRouter.get('/', async (_req: AuthedRequest, res: Response) => {
  const client = getAdminClient();
  if (!client) return void res.status(503).json({ error: 'AUTH_NOT_CONFIGURED' });
  const { data, error } = await client.from('profiles').select('id,email,role,created_at').order('created_at');
  if (error) return void res.status(500).json({ error: 'USERS_UNAVAILABLE', message: 'Unable to load users.' });
  res.json({ data });
});

const inviteSchema = z.object({ email: z.string().email(), role: z.enum(ROLES) });
usersRouter.post('/invite', async (req: AuthedRequest, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'INVALID_INVITATION' });
  const client = getAdminClient();
  if (!client) return void res.status(503).json({ error: 'AUTH_NOT_CONFIGURED' });
  const redirectTo = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '') + '/setup-password';
  const { data, error } = await client.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo });
  if (error || !data.user) return void res.status(400).json({ error: 'INVITATION_FAILED', message: 'Unable to invite this user.' });
  const { error: roleError } = await client.from('profiles').upsert({ id: data.user.id, email: parsed.data.email, role: parsed.data.role });
  if (roleError) return void res.status(500).json({ error: 'ROLE_ASSIGNMENT_FAILED', message: 'Invitation created, but its role could not be assigned.' });
  res.status(201).json({ data: { id: data.user.id, email: parsed.data.email, role: parsed.data.role } });
});

const roleAssignmentSchema = z.object({ role: z.enum(ROLES) });

// This is deliberately admin-only: role changes are made with the service
// client after the caller's own token and profile role were verified.
usersRouter.patch('/:id/role', async (req: AuthedRequest, res: Response) => {
  const parsed = roleAssignmentSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: 'INVALID_ROLE_ASSIGNMENT' });
  const id = req.params.id;
  if (!id) return void res.status(400).json({ error: 'INVALID_USER_ID' });
  const client = getAdminClient();
  if (!client) return void res.status(503).json({ error: 'AUTH_NOT_CONFIGURED' });
  const { data, error } = await client
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', id)
    .select('id,email,role,created_at')
    .maybeSingle();
  if (error) return void res.status(500).json({ error: 'ROLE_ASSIGNMENT_FAILED', message: 'Unable to update the user role.' });
  if (!data) return void res.status(404).json({ error: 'PROFILE_NOT_FOUND', message: 'No role profile exists for this user.' });
  res.json({ data });
});
