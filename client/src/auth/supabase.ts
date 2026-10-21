import { createClient } from '@supabase/supabase-js';

// These are public browser configuration values. The Supabase project and
// publishable key must be configured by the deployment; silently falling back
// to a different project can create a valid session that the API cannot verify.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const authConfigurationError = !supabase ? 'Authentication is unavailable because Supabase has not been configured.' : null;
