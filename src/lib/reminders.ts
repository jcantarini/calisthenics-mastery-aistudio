import { useEffect, useState } from "react";
import { todayKey, type AppState } from "./store";
import { BMI_META, bmi, bmiCategory, buildMealPlan, targetCalories } from "./nutrition";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export function getNotifPermission(): NotifPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPermission;
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    const p = await Notification.requestPermission();
    return p as NotifPermission;
  } catch {
    return "denied";
  }
}

function hhmmToMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function nowMin(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function fireNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: title,
    });
    n.onclick = () => {
      window.focus();
      try {
        if (window.location.pathname !== "/dieta") window.location.href = "/dieta";
      } catch {}
      n.close();
    };
    try {
      navigator.vibrate?.([180, 80, 180]);
    } catch {}
  } catch {}
}

/**
 * Foreground reminder engine. Runs while the app tab is open (including PWA
 * standalone). Checks every 30s and fires notifications for meals not yet
 * marked done and water below the daily goal, avoiding duplicates via
 * `lastFired` keys.
 */
export function useReminderEngine(
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
) {
  useEffect(() => {
    const r = state.reminders;
    if (!r.enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const tick = () => {
      const today = todayKey();
      const now = new Date();
      const nowM = nowMin(now);
      const patch: Record<string, string> = {};

      // Meal reminders: fire once per meal per day, from meal time up to +45 min.
      if (r.meals) {
        const profile = state.profile;
        const bmiCat = bmiCategory(bmi(profile));
        const goal = BMI_META[bmiCat].suggestedGoal;
        const kcalTarget =
          state.dietLog[today]?.kcalTarget ?? targetCalories(profile, goal);
        const meals = buildMealPlan(kcalTarget);
        const doneMap = state.dietLog[today]?.meals ?? {};

        for (const meal of meals) {
          const key = `meal:${meal.id}:${today}`;
          if (state.reminders.lastFired[key]) continue;
          if (doneMap[meal.id]) continue;
          const t = hhmmToMin(meal.time);
          if (nowM >= t && nowM <= t + 45) {
            fireNotification(
              `Hora do ${meal.name.toLowerCase()}`,
              `Marque no diário quando terminar. (${meal.time})`,
            );
            patch[key] = now.toISOString();
          }
        }
      }

      // Water reminders: every N minutes, within window, until goal is hit.
      if (r.water) {
        const from = hhmmToMin(r.waterFrom);
        const to = hhmmToMin(r.waterTo);
        if (nowM >= from && nowM <= to) {
          const goalMl = Math.round(Math.max(2, state.profile.weightKg * 0.035) * 1000);
          const drunk = state.dietLog[today]?.waterMl ?? 0;
          if (drunk < goalMl) {
            const lastIso = state.reminders.lastFired["water:last"];
            const lastMs = lastIso ? new Date(lastIso).getTime() : 0;
            const dueMs = Math.max(1, r.waterEveryMin) * 60_000;
            if (now.getTime() - lastMs >= dueMs) {
              const remainingMl = goalMl - drunk;
              fireNotification(
                "Hora de beber água",
                `Faltam ${(remainingMl / 1000).toFixed(1)}L para a meta de hoje.`,
              );
              patch["water:last"] = now.toISOString();
            }
          }
        }
      }

      if (Object.keys(patch).length) {
        setState((s) => ({
          ...s,
          reminders: {
            ...s.reminders,
            lastFired: { ...s.reminders.lastFired, ...patch },
          },
        }));
      }
    };

    // Run once immediately, then every 30 seconds.
    tick();
    const id = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    state.reminders,
    state.dietLog,
    state.profile,
    setState,
  ]);
}

/** Reactive Notification permission hook. */
export function useNotifPermission() {
  const [perm, setPerm] = useState<NotifPermission>(() => getNotifPermission());
  useEffect(() => {
    const onFocus = () => setPerm(getNotifPermission());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return [perm, setPerm] as const;
}
