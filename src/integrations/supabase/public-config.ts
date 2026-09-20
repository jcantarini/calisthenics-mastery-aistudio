/** Public client configuration only; this check never authenticates users. */
export function validatePublicConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) {
    throw new Error(
      "Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the application environment.",
    );
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("A privileged Supabase key cannot be used by the public client.");
  }
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = key.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
      if (claims.role !== "anon") throw new Error("Not an anon key");
    } catch {
      throw new Error("Use a Supabase publishable key or legacy anon key for the public client.");
    }
  }
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Supabase URL must use HTTP or HTTPS.");
  }
  return { url, key };
}
