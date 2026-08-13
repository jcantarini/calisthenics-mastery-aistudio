import { Target } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useGoalsT } from "@/lib/goals-i18n";
import type { GoalFilter } from "./goalPresentation";

/** Filter-aware empty state. All copy comes from goals-i18n. */
export function GoalsEmptyState({ filter, action }: { filter: GoalFilter; action?: ReactNode }) {
  const { tg } = useGoalsT();
  const key = filter === "all" ? "gl.empty" : `gl.empty.${filter}`;
  return (
    <EmptyState
      icon={<Target className="h-6 w-6" aria-hidden />}
      title={tg(`${key}.title`)}
      description={tg(`${key}.desc`)}
      action={action}
    />
  );
}
