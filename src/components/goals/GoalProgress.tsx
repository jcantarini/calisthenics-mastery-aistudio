import type { Goal, GoalProgress as GoalProgressData } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { ProgressBar } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
import { formatGoalValue } from "./goalPresentation";

/**
 * Renders progress that has ALREADY been calculated by the Goals domain.
 * It never computes percentages or completion itself.
 */
export function GoalProgress({
  goal,
  progress,
  className,
  compact = false,
}: {
  goal: Pick<Goal, "progressType" | "targetValue" | "unit" | "title">;
  progress: GoalProgressData;
  className?: string;
  compact?: boolean;
}) {
  const { tg } = useGoalsT();
  const value = formatGoalValue(goal, progress.rawValue, tg);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold tabular-nums">{value}</p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
          {progress.percentage}%
        </p>
      </div>
      <ProgressBar
        value={progress.percentage}
        label={`${tg("gl.progress")}: ${goal.title} — ${progress.percentage}%`}
      />
      {!compact && goal.progressType !== "boolean" && progress.remaining > 0 ? (
        <p className="text-xs text-muted-foreground">
          {tg("gl.remaining")}: {Math.round(progress.remaining * 10) / 10}{" "}
          {tg(`gl.unit.${goal.unit}`)}
        </p>
      ) : null}
    </div>
  );
}
