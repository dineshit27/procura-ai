import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const WORKSPACE_ROLES = ['admin', 'procurement_manager', 'finance_manager', 'requester'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
type AuthState = { session: Session | null; user: User | null; role: WorkspaceRole | null; loading: boolean; roleLoading: boolean; signOut: () => Promise<void>; refreshRole: () => Promise<WorkspaceRole | null> };
const AuthContext = createContext<AuthState | null>(null);
export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const refreshRole = async (): Promise<WorkspaceRole | null> => {
    if (!supabase) { setRole(null); return null; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRole(null); return null; }
    setRoleLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const next = !error && data && WORKSPACE_ROLES.includes(data.role as WorkspaceRole) ? data.role as WorkspaceRole : null;
      setRole(next); return next;
    } catch { setRole(null); return null; } finally { setRoleLoading(false); }
  };
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    void supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); if (!next) setRole(null); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session) void refreshRole(); else setRole(null); }, [session?.user.id]);
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, roleLoading, refreshRole, signOut: async () => { await supabase?.auth.signOut(); setRole(null); } }}>{children}</AuthContext.Provider>;
};
export function useAuth(): AuthState { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
