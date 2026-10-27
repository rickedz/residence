'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { ProfileRow } from './supabase';

export interface SessionState {
  profile: ProfileRow | null;
  loading: boolean;
}

/** Fetches the current Supabase session and the matching profile row.
 *  Returns { profile: null, loading: false } when there is no active session. */
export function useSession(): SessionState {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (!error && data) setProfile(data as ProfileRow);
        setLoading(false);
      }
    }

    load();

    // Keep profile in sync if the auth state changes (e.g. token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (!cancelled) { setProfile(null); setLoading(false); }
        return;
      }
      load();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
