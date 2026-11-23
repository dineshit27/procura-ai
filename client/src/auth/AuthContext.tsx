import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const WORKSPACE_ROLES = ['admin', 'procurement_manager', 'finance_manager', 'requester'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

type AuthState = {
  session: Session | null;
  user: User | null;
  role: WorkspaceRole | null;
  loading: boolean;
  roleLoading: boolean;
  signOut: () => Promise<void>;
  refreshRole: (userId?: string) => Promise<WorkspaceRole | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const activeSessionRef = useRef<Session | null>(null);
  const inFlightRolePromise = useRef<Promise<WorkspaceRole | null> | null>(null);

  const fetchRoleFromDatabase = async (userId: string): Promise<WorkspaceRole | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data && WORKSPACE_ROLES.includes(data.role as WorkspaceRole)) {
        return data.role as WorkspaceRole;
      }
      return null;
    } catch {
      return null;
    }
  };

  const refreshRole = async (targetUserId?: string): Promise<WorkspaceRole | null> => {
    if (!supabase) {
      setRole(null);
      return null;
    }

    const uid = targetUserId || activeSessionRef.current?.user?.id;
    if (!uid) {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.user?.id) {
        setRole(null);
        return null;
      }
      return refreshRole(s.user.id);
    }

    if (inFlightRolePromise.current) {
      return inFlightRolePromise.current;
    }

    setRoleLoading(true);
    const promise = (async () => {
      try {
        const next = await fetchRoleFromDatabase(uid);
        setRole(next);
        return next;
      } finally {
        setRoleLoading(false);
        inFlightRolePromise.current = null;
      }
    })();

    inFlightRolePromise.current = promise;
    return promise;
  };

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;

    // Load initial session AND role together before marking loading = false
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await client.auth.getSession();
        if (!active) return;

        activeSessionRef.current = initialSession;
        setSession(initialSession);

        if (initialSession?.user?.id) {
          const userRole = await fetchRoleFromDatabase(initialSession.user.id);
          if (active) {
            setRole(userRole);
          }
        } else {
          if (active) {
            setRole(null);
          }
        }
      } catch {
        if (active) {
          setSession(null);
          setRole(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initSession();

    const { data: listener } = client.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      activeSessionRef.current = nextSession;
      setSession(nextSession);

      if (event === 'SIGNED_OUT' || !nextSession) {
        setRole(null);
        setRoleLoading(false);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (nextSession.user?.id) {
          void refreshRole(nextSession.user.id);
        }
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    activeSessionRef.current = null;
    setRole(null);
    setSession(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        loading,
        roleLoading,
        refreshRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
