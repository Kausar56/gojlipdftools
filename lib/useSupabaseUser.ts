"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Client-side auth state. `undefined` = still checking, `null` = logged out (or Supabase not configured yet). */
export function useSupabaseUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setUser(null);
      return;
    }

    // No .catch() here left a network hiccup (Supabase unreachable) as an
    // unhandled rejection, with `user` stuck at `undefined` forever — any UI
    // gated on "still checking" vs. "logged out" (e.g. the nav's user menu)
    // would hang indefinitely instead of just falling back to logged-out.
    supabase.auth
      .getUser()
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return user;
}
