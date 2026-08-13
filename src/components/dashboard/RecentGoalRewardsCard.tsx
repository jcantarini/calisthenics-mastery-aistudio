import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, Zap } from "lucide-react";
import { useXPHistory } from "@/hooks/useXPHistory";
import { useGoalsT } from "@/lib/goals-i18n";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/components/goals/goalPresentation";
import { DashCard, SectionTitle, actionClasses } from "./primitives";
import { buildRecentGoalRewards } from "./goalsDashboard";
import type { Goal } from "@/services/goals/goalTypes";

export interface RecentGoalRewardsCardProps {
  /** Goals loaded once by the dashboard route; this card never fetches them. */
  goals: readonly Goal[];
}

/** Read-only projection of the XP ledger, restricted to goal rewards. */
export const RecentGoalRewardsCard = memo(function RecentGoalRewardsCard({
  goals,
}: RecentGoalRewardsCardProps) {
  const { tg } = useGoalsT();
  const { locale } = useT();
  const { data: entries, loading, error, reload } = useXPHistory(50);

  const rewards = useMemo(() => buildRecentGoalRewards(entries, goals, 3), [entries, goals]);

  return (
    <DashCard aria-label={tg("gl.rw.recent")}>
      <SectionTitle
        stack
        icon={<Trophy size={14} />}
        action={
          <Link to="/metas" className={actionClasses("outline")}>
            {tg("gl.viewGoals")}
          </Link>
        }
      >
        {tg("gl.rw.recent")}
      </SectionTitle>

      {loading ? (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          <span className="sr-only">{tg("gl.rw.loading")}</span>
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{tg("gl.rw.recentError")}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className={actionClasses("outline")}
            aria-label={tg("gl.dash.retry")}
          >
            {tg("gl.dash.retry")}
          </button>
        </div>
      ) : rewards.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{tg("gl.rw.recentEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {reward.goalTitle ?? tg("gl.rw.generic")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(reward.createdAt, locale)}
                </p>
              </div>
              <p className="inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-primary">
                <Zap className="h-3.5 w-3.5" aria-hidden />+{reward.amount} XP
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
});
