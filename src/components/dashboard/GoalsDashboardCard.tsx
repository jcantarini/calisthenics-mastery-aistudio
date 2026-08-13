import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Target } from "lucide-react";
import { useGoalsT } from "@/lib/goals-i18n";
import { useT } from "@/lib/i18n";
import { GoalProgress } from "@/components/goals/GoalProgress";
import { GoalStatusBadge } from "@/components/goals/GoalStatusBadge";
import { GoalTrackingBadge } from "@/components/goals/GoalTrackingBadge";
import { formatDate } from "@/components/goals/goalPresentation";
import { DashCard, Pill, SectionTitle, actionClasses } from "./primitives";
import { buildGoalsDashboardModel, goalCounterLabelKey } from "./goalsDashboard";
import type { Goal } from "@/services/goals/goalTypes";

export interface GoalsDashboardCardProps {
  /** Goals owned by the dashboard route; this card never fetches. */
  goals: readonly Goal[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/**
 * Dashboard entry point for the Goals domain. Reads only through the Goals
 * React access layer and renders values the domain already computed.
 */
export const GoalsDashboardCard = memo(function GoalsDashboardCard({
  goals,
  loading,
  error,
  onRetry,
}: GoalsDashboardCardProps) {
  const { tg } = useGoalsT();
  const { locale } = useT();

  // Canonical progress is built exactly once per loaded goal.
  const model = useMemo(() => buildGoalsDashboardModel(goals), [goals]);

  const viewAll = (
    <Link to="/metas" className={actionClasses("outline")}>
      {tg("gl.dash.viewAll")}
    </Link>
  );

  return (
    <DashCard aria-label={tg("gl.dash.title")}>
      <SectionTitle icon={<Target size={14} />} action={model.counts.total > 0 ? viewAll : null}>
        {tg("gl.dash.title")}
      </SectionTitle>

      {loading ? (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          <span className="sr-only">{tg("gl.dash.loading")}</span>
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted/40" />
          <div className="h-14 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm font-semibold">{tg("gl.dash.error")}</p>
          <p className="text-xs text-muted-foreground">{tg("gl.dash.errorDesc")}</p>
          <button
            type="button"
            onClick={onRetry}
            className={actionClasses("outline")}
            aria-label={tg("gl.dash.retry")}
          >
            {tg("gl.dash.retry")}
          </button>
        </div>
      ) : model.state === "empty" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold">{tg("gl.dash.empty")}</p>
          <p className="text-xs text-muted-foreground">{tg("gl.dash.emptyDesc")}</p>
          <Link to="/metas" className={actionClasses("primary")}>
            {tg("gl.create")}
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {model.spotlight ? (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {tg("gl.dash.spotlight")}
              </p>
              <p className="text-base font-bold leading-tight">{model.spotlight.goal.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <GoalStatusBadge status={model.spotlight.goal.status} />
                <GoalTrackingBadge goal={model.spotlight.goal} />
              </div>
              <GoalProgress goal={model.spotlight.goal} progress={model.spotlight.progress} />
              {model.spotlight.goal.targetDate ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {tg("gl.dash.deadline")}: {formatDate(model.spotlight.goal.targetDate, locale)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {model.state === "completedOnly"
                ? tg("gl.dash.completedOnly")
                : tg("gl.dash.inactive")}
            </p>
          )}

          <ul className="flex flex-wrap gap-2">
            <li>
              <Pill tone="primary">
                {model.counts.active + model.counts.draft}{" "}
                {tg(goalCounterLabelKey("active", model.counts.active + model.counts.draft))}
              </Pill>
            </li>
            {model.counts.paused > 0 ? (
              <li>
                <Pill>
                  {model.counts.paused} {tg(goalCounterLabelKey("paused", model.counts.paused))}
                </Pill>
              </li>
            ) : null}
            <li>
              <Pill tone="accent">
                {model.counts.completed}{" "}
                {tg(goalCounterLabelKey("completed", model.counts.completed))}
              </Pill>
            </li>
          </ul>
        </div>
      )}
    </DashCard>
  );
});
