import { useEffect, useState } from "react";

const KEY = "barra:state:v1";

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
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultState: AppState = {
  streak: 4,
  lastSession: new Date(Date.now() - 86400000).toISOString(),
  completedSessions: Array.from({ length: 12 }, (_, i) =>
    new Date(Date.now() - i * 86400000 * 2).toISOString(),
  ),
  completedExercises: {},
  activeProgram: "fundacao",
  weeklyGoal: 4,
  goals: [
    { id: "g1", label: "5 barras estritas seguidas", done: false },
    { id: "g2", label: "10 flexões diamante", done: true },
    { id: "g3", label: "30s de prancha lateral", done: true },
    { id: "g4", label: "Primeiro muscle-up", done: false },
  ],
  profile: {
    name: "Bruno Ribeiro",
    initials: "BR",
    weightKg: 72,
    heightCm: 178,
    birthYear: 1995,
    memberSince: "março de 2025",
    sex: "masculino",
    activity: "moderado",
  },
  dietLog: {},
};

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
        });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  return [state, setState, hydrated] as const;
}
