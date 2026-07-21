import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayKey, type AppState } from "./store";

export type WorkoutReminder = {
  id: string;
  days: number[]; // 0=Sun .. 6=Sat
  time: string;   // "HH:MM"
  snoozeUntil?: string; // ISO
};

export type WorkoutReminderSettings = {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  reminders: WorkoutReminder[];
  lastFired: Record<string, string>;
};

const KEY = "barra:workout-reminders:v1";

export const DEFAULT_WR: WorkoutReminderSettings = {
  enabled: false,
  sound: true,
  vibration: true,
  reminders: [],
  lastFired: {},
};

function loadLocal(): WorkoutReminderSettings {
  if (typeof window === "undefined") return DEFAULT_WR;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WR;
    return { ...DEFAULT_WR, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WR;
  }
}

function saveLocal(s: WorkoutReminderSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

// ---------------- Permissions ----------------

export type NotifPerm = "default" | "granted" | "denied" | "unsupported";

export function getNotifPerm(): NotifPerm {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPerm;
}

export async function requestNotifPerm(): Promise<NotifPerm> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifPerm;
  } catch {
    return "denied";
  }
}

// ---------------- Capacitor bridge (best-effort, web-safe) ----------------
// If the app runs inside a Capacitor shell with @capacitor/local-notifications,
// mirror the schedule there for background delivery. On the web we fall back
// to the foreground Notification API.

type CapNotif = { title: string; body: string; id: number; at?: Date };
async function capSchedule(items: CapNotif[]) {
  try {
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    if (!w.Capacitor?.isNativePlatform?.()) return false;
    const mod = await import(/* @vite-ignore */ "@capacitor/local-notifications").catch(() => null as unknown);
    if (!mod || typeof mod !== "object") return false;
    const LN = (mod as { LocalNotifications?: { schedule: (o: unknown) => Promise<unknown> } }).LocalNotifications;
    if (!LN) return false;
    await LN.schedule({
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: n.at ? { at: n.at } : undefined,
      })),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------- Remote sync ----------------

type RemoteRow = {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  reminders: WorkoutReminder[] | null;
};

export async function fetchRemote(): Promise<WorkoutReminderSettings | null> {
  try {
    const { data } = await supabase
      .from("workout_reminder_settings")
      .select("enabled, sound, vibration, reminders")
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as RemoteRow;
    return {
      enabled: !!row.enabled,
      sound: !!row.sound,
      vibration: !!row.vibration,
      reminders: Array.isArray(row.reminders) ? row.reminders : [],
      lastFired: {},
    };
  } catch {
    return null;
  }
}

export async function saveRemote(s: WorkoutReminderSettings) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("workout_reminder_settings").upsert({
      user_id: u.user.id,
      enabled: s.enabled,
      sound: s.sound,
      vibration: s.vibration,
      reminders: s.reminders as unknown as never,
    });
  } catch {}
}

// ---------------- Hook: settings + sync ----------------

export function useWorkoutReminders() {
  const [settings, setSettings] = useState<WorkoutReminderSettings>(DEFAULT_WR);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const local = loadLocal();
    setSettings(local);
    setHydrated(true);
    (async () => {
      const remote = await fetchRemote();
      if (remote) {
        const merged = { ...remote, lastFired: local.lastFired };
        setSettings(merged);
        saveLocal(merged);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
      const remote = await fetchRemote();
      if (remote) {
        setSettings((prev) => {
          const merged = { ...remote, lastFired: prev.lastFired };
          saveLocal(merged);
          return merged;
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLocal(settings);
  }, [settings, hydrated]);

  const update = useCallback(
    (patch: Partial<WorkoutReminderSettings> | ((s: WorkoutReminderSettings) => WorkoutReminderSettings)) => {
      setSettings((s) => {
        const next = typeof patch === "function" ? patch(s) : { ...s, ...patch };
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => saveRemote(next), 400);
        return next;
      });
    },
    [],
  );

  return { settings, update, hydrated };
}

// ---------------- Scheduling helpers ----------------

function hhmmToMin(h: string) {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + (b || 0);
}

export function nextReminder(s: WorkoutReminderSettings): { reminder: WorkoutReminder; at: Date } | null {
  if (!s.enabled || s.reminders.length === 0) return null;
  const now = new Date();
  let best: { r: WorkoutReminder; d: Date } | null = null;
  for (const r of s.reminders) {
    // Snooze wins if in the future.
    if (r.snoozeUntil) {
      const sn = new Date(r.snoozeUntil);
      if (sn.getTime() > now.getTime()) {
        if (!best || sn < best.d) best = { r, d: sn };
      }
    }
    if (r.days.length === 0) continue;
    const [h, m] = r.time.split(":").map(Number);
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(h, m || 0, 0, 0);
      if (!r.days.includes(d.getDay())) continue;
      if (d.getTime() <= now.getTime()) continue;
      if (!best || d < best.d) best = { r, d };
      break;
    }
  }
  return best ? { reminder: best.r, at: best.d } : null;
}

// ---------------- Notification helpers ----------------

const MSG_KEYS = [
  "wr.msg.time",
  "wr.msg.consistent",
  "wr.msg.closer",
  "wr.msg.futureSelf",
] as const;

export function pickMessage(t: (k: string) => string, streak: number): string {
  if (streak >= 3) return t("wr.msg.streak").replace("{n}", String(streak));
  const k = MSG_KEYS[Math.floor(Math.random() * MSG_KEYS.length)];
  return t(k);
}

export function fireNotification(
  title: string,
  body: string,
  opts: { sound: boolean; vibration: boolean },
) {
  try {
    if (getNotifPerm() !== "granted") return;
    const n = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "workout-reminder",
      silent: !opts.sound,
    });
    n.onclick = () => {
      window.focus();
      try {
        if (window.location.pathname !== "/treinos") window.location.href = "/treinos";
      } catch {}
      n.close();
    };
    if (opts.vibration) {
      try {
        navigator.vibrate?.([220, 90, 220]);
      } catch {}
    }
  } catch {}
}

function trainedToday(state: AppState): boolean {
  const list = state.workoutLog[todayKey()];
  return !!list && list.length > 0;
}

function daysSinceLastWorkout(state: AppState): number {
  if (!state.lastSession) return Infinity;
  const last = new Date(state.lastSession).getTime();
  return Math.floor((Date.now() - last) / 86_400_000);
}

// ---------------- Engine ----------------

export function useWorkoutReminderEngine(
  state: AppState,
  settings: WorkoutReminderSettings,
  update: (fn: (s: WorkoutReminderSettings) => WorkoutReminderSettings) => void,
  t: (k: string) => string,
) {
  useEffect(() => {
    if (!settings.enabled) return;
    if (typeof window === "undefined") return;
    if (getNotifPerm() !== "granted") return;

    // Best-effort background schedule for Capacitor shells.
    const next = nextReminder(settings);
    if (next) {
      void capSchedule([
        {
          id: 1001,
          title: t("wr.notif.title"),
          body: pickMessage(t, state.streak),
          at: next.at,
        },
      ]);
    }

    const tick = () => {
      const now = new Date();
      const nowMs = now.getTime();
      const nowM = now.getHours() * 60 + now.getMinutes();
      const dow = now.getDay();
      const today = todayKey(now);
      const patches: Record<string, string> = {};
      let clearSnoozeFor: string | null = null;

      // 1) Snoozed firings.
      for (const r of settings.reminders) {
        if (!r.snoozeUntil) continue;
        const sn = new Date(r.snoozeUntil).getTime();
        const key = `snz:${r.id}:${sn}`;
        if (sn <= nowMs && !settings.lastFired[key]) {
          if (!trainedToday(state)) {
            fireNotification(
              t("wr.notif.title"),
              pickMessage(t, state.streak),
              { sound: settings.sound, vibration: settings.vibration },
            );
          }
          patches[key] = new Date().toISOString();
          clearSnoozeFor = r.id;
        }
      }

      // 2) Scheduled firings within [T, T+30min].
      for (const r of settings.reminders) {
        if (!r.days.includes(dow)) continue;
        const t0 = hhmmToMin(r.time);
        const key = `sch:${r.id}:${today}`;
        if (settings.lastFired[key]) continue;
        if (nowM < t0 || nowM > t0 + 30) continue;
        if (trainedToday(state)) {
          patches[key] = new Date().toISOString();
          continue;
        }
        fireNotification(
          t("wr.notif.title"),
          pickMessage(t, state.streak),
          { sound: settings.sound, vibration: settings.vibration },
        );
        patches[key] = new Date().toISOString();
      }

      // 3) Reengagement — 3+ days without training, once/day, after 18:00.
      const idle = daysSinceLastWorkout(state);
      const reKey = `re:${today}`;
      if (
        idle >= 3 &&
        nowM >= 18 * 60 &&
        !settings.lastFired[reKey] &&
        !trainedToday(state)
      ) {
        fireNotification(
          t("wr.notif.title"),
          t("wr.msg.reengage"),
          { sound: settings.sound, vibration: settings.vibration },
        );
        patches[reKey] = new Date().toISOString();
      }

      if (Object.keys(patches).length || clearSnoozeFor) {
        update((s) => ({
          ...s,
          reminders: clearSnoozeFor
            ? s.reminders.map((x) =>
                x.id === clearSnoozeFor ? { ...x, snoozeUntil: undefined } : x,
              )
            : s.reminders,
          lastFired: { ...s.lastFired, ...patches },
        }));
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state, settings, update, t]);
}
