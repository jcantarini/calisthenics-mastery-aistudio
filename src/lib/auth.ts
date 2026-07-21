import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

/** Reactive Supabase session hook. Restores persisted session on mount and
 *  subscribes to auth state changes. */
export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up the listener FIRST to avoid missing an event during initial getSession.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function profileFromUser(user: User | null): AuthProfile | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : null);
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: pick("full_name") ?? pick("name") ?? (user.email ? user.email.split("@")[0] : null),
    avatar_url: pick("avatar_url") ?? pick("picture"),
  };
}
