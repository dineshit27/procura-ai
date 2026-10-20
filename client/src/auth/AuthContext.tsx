import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthState = { session: Session | null; user: User | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    void supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut: async () => { await supabase?.auth.signOut(); } }}>{children}</AuthContext.Provider>;
};
export function useAuth(): AuthState { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
