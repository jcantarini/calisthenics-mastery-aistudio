import { describe, expect, it, vi } from "vitest";
import { validatePublicConfig } from "./public-config";
import { oauthRedirectUrl, safeRedirect, signInWithProvider } from "./oauth";

const { oauth } = vi.hoisted(() => ({ oauth: vi.fn() }));
vi.mock("./client", () => ({ supabase: { auth: { signInWithOAuth: oauth } } }));

describe("portable public configuration", () => {
  const url = "https://example.supabase.co";
  const jwt = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
  it("accepts publishable and legacy anon keys", () => {
    expect(validatePublicConfig(url, "sb_publishable_test").url).toBe(url);
    expect(validatePublicConfig(url, jwt("anon")).key).toBe(jwt("anon"));
  });
  it.each(["sb_secret_test", jwt("service_role"), "malformed"])(
    "rejects privileged or malformed public configuration (%s)",
    (key) => expect(() => validatePublicConfig(url, key)).toThrow(),
  );
  it("reports missing configuration without leaking values", () => {
    expect(() => validatePublicConfig(undefined, "secret-value")).toThrow("VITE_SUPABASE_URL");
    expect(() => validatePublicConfig(url, undefined)).toThrow("VITE_SUPABASE_PUBLISHABLE_KEY");
  });
});

describe("portable OAuth", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2fevil.example",
    "/%0aevil",
    "/%",
  ])("rejects unsafe destinations (%s)", (path) => expect(safeRedirect(path)).toBeNull());
  it("keeps a local destination through the auth callback", () => {
    const callback = new URL(oauthRedirectUrl("https://app.example", "/goals?tab=active"));
    expect(callback.origin).toBe("https://app.example");
    expect(callback.pathname).toBe("/auth");
    expect(callback.searchParams.get("redirect")).toBe("/goals?tab=active");
  });
  it.each(["google", "apple"] as const)("uses Supabase directly for %s", async (provider) => {
    vi.stubGlobal("window", { location: { origin: "https://app.example" } });
    oauth.mockResolvedValueOnce({ data: { url: "https://provider.example" }, error: null });
    try {
      await signInWithProvider(provider, "/goals");
      expect(oauth).toHaveBeenLastCalledWith({
        provider,
        options: { redirectTo: "https://app.example/auth?redirect=%2Fgoals" },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
