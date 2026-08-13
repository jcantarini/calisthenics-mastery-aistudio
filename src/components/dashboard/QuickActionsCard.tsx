import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Dumbbell, ListChecks, Play, Target, type LucideIcon } from "lucide-react";
import { useGoalsT } from "@/lib/goals-i18n";
import { DashCard, SectionTitle } from "./primitives";
import { DASHBOARD_QUICK_ACTIONS, type QuickAction } from "./quickActions";

const ICONS: Record<QuickAction["icon"], LucideIcon> = {
  play: Play,
  list: ListChecks,
  chart: BarChart3,
  target: Target,
  dumbbell: Dumbbell,
};

export const QuickActionsCard = memo(function QuickActionsCard() {
  const { tg } = useGoalsT();

  return (
    <DashCard aria-label={tg("gl.qa.title")}>
      <SectionTitle>{tg("gl.qa.title")}</SectionTitle>
      <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {DASHBOARD_QUICK_ACTIONS.map(({ to, labelKey, icon }) => {
          const Icon = ICONS[icon];
          const label = tg(labelKey);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="press flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 p-3 text-center text-[11px] font-semibold leading-tight hover:border-primary/40 hover:bg-background/70"
            >
              <Icon className="h-4.5 w-4.5 text-primary" aria-hidden />
              <span className="truncate max-w-full">{label}</span>
            </Link>
          );
        })}
      </nav>
    </DashCard>
  );
});
