import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useT } from "@/lib/i18n";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Barra" },
      { name: "description", content: "Entre no Barra para acessar seus treinos, metas e dieta." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<"google" | "apple" | null>(null);

  // If already signed in, bounce straight to the intended destination.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        void navigate({ to: safeRedirect(redirect) || "/", replace: true });
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void navigate({ to: safeRedirect(redirect) || "/", replace: true });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  const signInWith = async (provider: "google" | "apple") => {
    setSigningIn(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("auth.error"), { description: result.error.message });
        setSigningIn(null);
        return;
      }
      // Redirect flow: browser navigates away; popup flow: onAuthStateChange takes over.
    } catch (err) {
      toast.error(t("auth.error"), {
        description: err instanceof Error ? err.message : String(err),
      });
      setSigningIn(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto flex min-h-screen max-w-md flex-col justify-between bg-background bg-grain px-6 pb-10 pt-16"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}
    >

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/25 blur-2xl" />
          <img
            src="/icon-512.png"
            alt="Barra"
            className="relative h-20 w-20 rounded-3xl shadow-glow"
            width={80}
            height={80}
          />
        </div>
        <h1 className="mt-6 text-display text-5xl leading-none">
          BARRA
        </h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          {t("auth.subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => signInWith("google")}
          disabled={signingIn !== null}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {signingIn === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          {t("auth.continueGoogle")}
        </button>
        <button
          onClick={() => signInWith("apple")}
          disabled={signingIn !== null}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-5 py-4 text-sm font-bold uppercase tracking-widest text-background transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {signingIn === "apple" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <AppleIcon className="h-5 w-5" />
          )}
          {t("auth.continueApple")}
        </button>
        <p className="pt-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("auth.terms")}
        </p>
      </div>
    </div>
  );
}

function safeRedirect(value: string | undefined): string | null {
  if (!value) return null;
  // Only allow same-origin relative paths.
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.26 3.08-.9.93-2.02 1.47-3.07 1.38-.13-1.11.42-2.28 1.23-3.09.83-.86 2.02-1.44 3.1-1.5v.13zM20.5 17.4c-.55 1.24-.82 1.79-1.53 2.88-.99 1.52-2.39 3.42-4.11 3.44-1.53.01-1.93-.99-4.02-.98-2.09.01-2.52 1-4.05.98-1.72-.02-3.05-1.75-4.04-3.27C.14 16.24-.14 11.2 2.03 8.35c1.55-2.02 3.98-3.2 6.27-3.2 2.33 0 3.8 1.28 5.72 1.28 1.87 0 3-1.28 5.7-1.28 2.04 0 4.2 1.11 5.74 3.02-5.04 2.76-4.22 9.97 1.04 12.23-.44 1.2-.65 1.74-2 3z"/>
    </svg>
  );
}
