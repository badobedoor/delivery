"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase }             from "@/lib/supabase";
import { getUserProfile }       from "@/lib/auth";
import type { Profile }         from "@/lib/auth";

export type { Profile };

export interface AuthState {
  user:    User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* Load initial session — always call setLoading(false) regardless of outcome */
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          try {
            setProfile(await getUserProfile(u.id));
          } catch {
            /* profile fetch failed — proceed without it */
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    /* Stay in sync with auth state changes (sign-in / sign-out / token refresh) */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          try {
            setProfile(await getUserProfile(u.id));
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
}
