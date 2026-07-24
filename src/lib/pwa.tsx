import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { HomeSkeleton } from "@/components/ui/skeleton-blocks";

/** Sync <meta name="theme-color"> with the current theme so the Android status bar matches. */
export function ThemeColorSync() {
  const { theme } = useTheme();
  useEffect(() => {
    const color = theme === "light" ? "#f5f5f4" : "#1a1d24";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
    // background color for iOS PWA
    let statusBar = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    if (!statusBar) {
      statusBar = document.createElement("meta");
      statusBar.name = "apple-mobile-web-app-status-bar-style";
      document.head.appendChild(statusBar);
    }
    statusBar.content = theme === "light" ? "default" : "black-translucent";
  }, [theme]);
  return null;
}

/** Full-screen splash shown while the app boots. Fades out after hydration. */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), 550);
    const hideTimer = window.setTimeout(() => setVisible(false), 1050);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] grid place-items-center bg-background transition-opacity duration-500"
      style={{
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/25 blur-2xl" />
          <img
            src="/icon-512.png"
            alt=""
            className="relative h-24 w-24 rounded-3xl shadow-glow"
            width={96}
            height={96}
          />
        </div>
        <div className="text-display text-3xl tracking-tight text-primary">BARRA</div>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

/** Layout-matched loader used during route transitions to avoid CLS. */
export function RouteLoader() {
  return <HomeSkeleton />;
}

/** Banner that appears when the browser reports the device is offline. */
export function OfflineBanner() {
  const { t } = useT();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 z-[120] flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <div className="flex items-center gap-2 rounded-full bg-destructive/95 px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-card backdrop-blur">
        <WifiOff className="h-4 w-4" />
        {t("offline.banner")}
      </div>
    </div>
  );
}

/**
 * Intercepts the Android hardware back button (which fires `popstate`) to
 * close an open sheet/dialog instead of navigating away from the app.
 * Push an extra history entry on open; on back, consume it and call onClose.
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const marker = { __barraSheet: true, at: Date.now() };
    window.history.pushState(marker, "");
    const handler = () => onClose();
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      // If the sheet was closed via UI (not back button), pop our extra entry.
      if ((window.history.state as { __barraSheet?: boolean } | null)?.__barraSheet) {
        window.history.back();
      }
    };
  }, [open, onClose]);
}
