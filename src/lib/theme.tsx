import { useSyncExternalStore, useEffect, type ReactNode } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "barra:theme";
const listeners = new Set<() => void>();
let current: Theme = "dark";
let hydrated = false;

function readInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

function applyToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): Theme {
  return current;
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function setTheme(next: Theme) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyToDocument(next);
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}

export function ThemeBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    current = readInitial();
    applyToDocument(current);
    listeners.forEach((l) => l());
  }, []);
  return <>{children}</>;
}
