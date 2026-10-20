import { createClient } from '@supabase/supabase-js';

// These are public browser configuration values. Deployment variables take
// precedence, while the fallbacks keep the published client connected when a
// static host omits Vite build-time environment variables.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://kvtgkxntyebglyriufbb.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eN98NYJ1x_DSLw4YJvOB7g_-Kv0ocCm';
export const supabase = url && key ? createClient(url, key) : null;
export const authConfigurationError = !supabase ? 'Authentication is unavailable because Supabase has not been configured.' : null;
