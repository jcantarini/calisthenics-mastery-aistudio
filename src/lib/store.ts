import { useEffect, useState } from "react";

const KEY = "barra:state:v1";

export interface AppState {
  streak: number;
  lastSession: string | null; // ISO date
  completedSessions: string[]; // ISO dates
  completedExercises: Record<string, boolean>;
  activeProgram: string | null;
  weeklyGoal: number;
  goals: { id: string; label: string; done: boolean }[];
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
};

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
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
