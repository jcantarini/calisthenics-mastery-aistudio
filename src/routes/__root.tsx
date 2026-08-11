import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Dumbbell, Apple, Target, User, AlertOctagon } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { cn } from "@/lib/utils";
import { useAppState, type AppState } from "@/lib/store";
import { useReminderEngine } from "@/lib/reminders";
import { useWorkoutReminders, useWorkoutReminderEngine } from "@/lib/workout-reminders";
import { I18nBootstrap, useT } from "@/lib/i18n";
import { ThemeBootstrap } from "@/lib/theme";
import { SplashScreen, OfflineBanner, ThemeColorSync } from "@/lib/pwa";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { PageTransition } from "@/components/ui/page-transition";
import { GamificationHost } from "@/components/gamification/GamificationHost";

function NotFoundComponent() {
  const { t } = useT();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("404.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("404.desc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("404.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
          <AlertOctagon className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">{t("error.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("error.desc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("common.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("common.start")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1d24" },
      { title: "Barra — Calistenia do zero ao avançado" },
      {
        name: "description",
        content:
          "App de calistenia com programas do iniciante ao avançado, vídeos de execução, metas e progresso — feito para o seu smartphone.",
      },
      { property: "og:title", content: "Barra — Calistenia do zero ao avançado" },
      {
        property: "og:description",
        content:
          "Programas guiados, vídeos de execução e metas para dominar a calistenia com peso do corpo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png", sizes: "512x512" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navItems = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/treinos", key: "nav.workouts", icon: Dumbbell },
  { to: "/dieta", key: "nav.diet", icon: Apple },
  { to: "/progresso", key: "nav.progress", icon: Target },
  { to: "/perfil", key: "nav.profile", icon: User },
] as const;

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();
  // Nav visibility depends on the resolved client route: render after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Hide chrome on the public auth screen and during onboarding/assessment.
  if (!hydrated) return null;
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/assessment") ||
    pathname.startsWith("/first-workout") ||
    pathname.startsWith("/training-plan")
  )
    return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {navItems.map(({ to, key, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                aria-label={t(key)}
                className={cn(
                  "flex min-h-14 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-widest transition-colors active:scale-[0.94]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full transition-all",
                    active && "bg-primary/15 shadow-glow",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} aria-hidden />
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AuthStateSync() {
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  return null;
}

/**
 * Sprint 7.3B — single, non-blocking trigger for goal reward reconciliation.
 * React only fires the call; all recovery logic lives in the service layer.
 * Runs once per authenticated session (and on reconnect); failures are silent
 * for the user and logged for diagnostics.
 */
function GoalRewardRecoveryHost() {
  useEffect(() => {
    const done = new Set<string>();
    let disposed = false;

    const run = (userId?: string) => {
      if (disposed || !userId || done.has(userId)) return;
      done.add(userId);
      void import("@/services/goals/GoalRewardRecovery").then(({ GoalRewardRecoveryService }) => {
        if (!disposed) GoalRewardRecoveryService.reconcileSafely(userId);
      });
    };

    void supabase.auth.getSession().then(({ data }) => run(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") done.clear();
      if (event === "SIGNED_IN") run(session?.user.id);
    });
    // Reconnect-safe: the method is idempotent, so a reconnect may re-run it.
    const onOnline = () => {
      done.clear();
      void supabase.auth.getSession().then(({ data }) => run(data.session?.user.id));
    };
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      sub.subscription.unsubscribe();
    };
  }, []);
  return null;
}

function WorkoutReminderHost({ state }: { state: AppState }) {
  const { settings, update } = useWorkoutReminders();
  const { t } = useT();
  useWorkoutReminderEngine(state, settings, update, t);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [state, setState] = useAppState();
  useReminderEngine(state, setState);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrap>
        <I18nBootstrap>
          <ThemeColorSync />
          <AuthStateSync />
          <WorkoutReminderHost state={state} />
          <SplashScreen />
          <OfflineBanner />
          <Toaster position="top-center" richColors closeButton />
          <GamificationHost />
          <div
            className="relative mx-auto min-h-dvh max-w-md bg-background bg-grain"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-glow"
            >
              Pular para o conteúdo
            </a>
            <main id="main-content" className="pb-28">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </main>
            <BottomNav />
          </div>
        </I18nBootstrap>
      </ThemeBootstrap>
    </QueryClientProvider>
  );
}
