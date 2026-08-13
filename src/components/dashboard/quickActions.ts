// Dashboard quick actions — pure route/label table so destinations stay
// testable and cannot silently drift.

export interface QuickAction {
  to: string;
  /** Goals i18n / app i18n key resolved by the card. */
  labelKey: string;
  icon: "play" | "list" | "chart" | "target" | "dumbbell";
}

export const DASHBOARD_QUICK_ACTIONS: readonly QuickAction[] = [
  { to: "/timer", labelKey: "gl.qa.start", icon: "play" },
  { to: "/training-plan", labelKey: "gl.qa.program", icon: "list" },
  { to: "/relatorio", labelKey: "gl.qa.history", icon: "chart" },
  { to: "/metas", labelKey: "gl.qa.goals", icon: "target" },
  { to: "/treinos", labelKey: "gl.qa.exercises", icon: "dumbbell" },
] as const;

export function quickActionTarget(labelKey: string): string | null {
  return DASHBOARD_QUICK_ACTIONS.find((a) => a.labelKey === labelKey)?.to ?? null;
}
