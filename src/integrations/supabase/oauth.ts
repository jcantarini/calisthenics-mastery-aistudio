import { supabase } from "./client";

export function safeRedirect(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      [...decoded].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    )
      return null;
  } catch {
    return null;
  }
  return value;
}

export function oauthRedirectUrl(origin: string, redirect?: string): string {
  const callback = new URL("/auth", origin);
  const destination = safeRedirect(redirect);
  if (destination) callback.searchParams.set("redirect", destination);
  return callback.toString();
}

export function signInWithProvider(provider: "google" | "apple", redirect?: string) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirectUrl(window.location.origin, redirect) },
  });
}
