import { CalendarClock, ChevronRight, Trophy } from "lucide-react";
import type { Goal, GoalProgress as GoalProgressData } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import { CardIcon } from "@/components/dashboard/primitives";
import { PressableCard } from "@/components/ui/motion";
import { GoalProgress } from "./GoalProgress";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalDifficultyBadge } from "./GoalDifficultyBadge";
import { GoalTrackingBadge } from "./GoalTrackingBadge";
import { categoryIcon, categoryLabelKey, deadlineInfo, formatDate } from "./goalPresentation";

/**
 * One goal, at a glance. Progress arrives already calculated by the Goals
 * domain — the card itself owns no goal rules.
 */
export function GoalCard({
  goal,
  progress,
  onOpen,
}: {
  goal: Goal;
  progress: GoalProgressData;
  onOpen: (goal: Goal) => void;
}) {
  const { tg, locale } = useGoalsT();
  const Icon = categoryIcon(goal.category);
  const deadline = deadlineInfo(goal.targetDate);
  const completed = goal.status === "completed";

  const deadlineText = (() => {
    if (completed) return `${tg("gl.completedAt")} ${formatDate(goal.completedAt, locale)}`;
    if (!deadline) return tg("gl.noDeadline");
    if (deadline.overdue) return tg("gl.overdue");
    if (deadline.lastDay) return tg("gl.lastDay");
    return `${deadline.daysLeft} ${tg(deadline.daysLeft === 1 ? "gl.dayLeft" : "gl.daysLeft")}`;
  })();

  return (
    <PressableCard>
      <article
        className={cn(
          "rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card",
          completed && "border-success/30",
          goal.status === "paused" && "opacity-90",
        )}
      >
        <button
          type="button"
          onClick={() => onOpen(goal)}
          className="flex w-full items-start gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <CardIcon tone={completed ? "accent" : "primary"}>
            {completed ? <Trophy className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </CardIcon>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight">{goal.title}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {tg(categoryLabelKey(goal.category))}
            </p>
          </div>
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">{tg("gl.details")}</span>
        </button>

        <GoalProgress goal={goal} progress={progress} compact className="mt-4" />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <GoalStatusBadge status={goal.status} />
          <GoalTrackingBadge goal={goal} />
          <GoalDifficultyBadge difficulty={goal.difficulty} />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{deadlineText}</span>
        </p>
      </article>
    </PressableCard>
  );
}
