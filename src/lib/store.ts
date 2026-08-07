import { useEffect, useState } from "react";

const KEY = "barra:state:v2";

export type Sex = "masculino" | "feminino";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";

export interface Profile {
  name: string;
  initials: string;
  weightKg: number;
  heightCm: number;
  birthYear: number;
  memberSince: string; // e.g. "março de 2025"
  sex: Sex;
  activity: ActivityLevel;
}

export interface DietDayLog {
  meals: Record<string, boolean>;
  waterMl: number;
  kcalTarget?: number;
}

export interface WorkoutSession {
  id: string;
  at: string; // ISO
  source: "timer" | "programa" | "manual";
  label: string;
  durationSec: number;
  kcalBurned: number;
}

export interface RemindersConfig {
  enabled: boolean;
  meals: boolean;
  water: boolean;
  waterEveryMin: number;
  waterFrom: string; // HH:MM
  waterTo: string; // HH:MM
  lastFired: Record<string, string>; // key -> ISO
}

export interface AppState {
  streak: number;
  lastSession: string | null; // ISO date
  completedSessions: string[]; // ISO dates
  completedExercises: Record<string, boolean>;
  activeProgram: string | null;
  weeklyGoal: number;
  goals: { id: string; label: string; done: boolean }[];
  profile: Profile;
  dietLog: Record<string, DietDayLog>;
  workoutLog: Record<string, WorkoutSession[]>;
  reminders: RemindersConfig;
}

export const DEFAULT_REMINDERS: RemindersConfig = {
  enabled: false,
  meals: true,
  water: true,
  waterEveryMin: 120,
  waterFrom: "08:00",
  waterTo: "22:00",
  lastFired: {},
};

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultState: AppState = {
  streak: 0,
  lastSession: null,
  completedSessions: [],
  completedExercises: {},
  activeProgram: null,
  weeklyGoal: 4,
  goals: [],
  profile: {
    name: "",
    initials: "??",
    weightKg: 70,
    heightCm: 170,
    birthYear: new Date().getFullYear() - 25,
    memberSince: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    sex: "masculino",
    activity: "moderado",
  },
  dietLog: {},
  workoutLog: {},
  reminders: DEFAULT_REMINDERS,
};

/** MET-based kcal burned estimate. */
export function estimateKcal(met: number, weightKg: number, durationSec: number) {
  return Math.round((met * weightKg * durationSec) / 3600);
}

export function logWorkoutSession(
  state: AppState,
  session: Omit<WorkoutSession, "id" | "at"> & { at?: string },
): AppState {
  const at = session.at ?? new Date().toISOString();
  const key = todayKey(new Date(at));
  const s: WorkoutSession = {
    id: `w${Date.now()}`,
    at,
    source: session.source,
    label: session.label,
    durationSec: session.durationSec,
    kcalBurned: session.kcalBurned,
  };
  const prevList = state.workoutLog[key] ?? [];
  const wasToday = state.lastSession ? todayKey(new Date(state.lastSession)) === todayKey() : false;
  return {
    ...state,
    workoutLog: { ...state.workoutLog, [key]: [s, ...prevList] },
    completedSessions: [at, ...state.completedSessions].slice(0, 120),
    lastSession: at,
    streak: wasToday ? state.streak : state.streak + 1,
  };
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...defaultState,
          ...parsed,
          profile: { ...defaultState.profile, ...(parsed.profile ?? {}) },
          dietLog: { ...(parsed.dietLog ?? {}) },
          workoutLog: { ...(parsed.workoutLog ?? {}) },
          reminders: { ...DEFAULT_REMINDERS, ...(parsed.reminders ?? {}) },
        });
      }
    } catch {
      /* ignore: non-critical */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore: non-critical */
    }
  }, [state, hydrated]);

  return [state, setState, hydrated] as const;
}
