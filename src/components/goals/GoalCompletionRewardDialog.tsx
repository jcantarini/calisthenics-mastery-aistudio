import { useMemo } from "react";
import { CheckCircle2, Hourglass, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useXPHistory } from "@/hooks/useXPHistory";
import { useGoalsT } from "@/lib/goals-i18n";
import { findGoalRewardEntry, goalRewardState } from "@/components/dashboard/goalsDashboard";
import type { Goal } from "@/services/goals/goalTypes";

/**
 * Authoritative reward presentation: the amount shown is always the persisted
 * XP ledger amount. Nothing is estimated, calculated or awarded here.
 */
export function GoalCompletionRewardDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tg } = useGoalsT();
  const { data: entries, loading, error, reload } = useXPHistory(50);

  const entry = useMemo(() => findGoalRewardEntry(entries, goal?.id ?? null), [entries, goal?.id]);
  const state = goalRewardState({ loading, error: error !== null, entry });

  return (
    <Dialog open={open && goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            {tg("gl.rw.title")}
          </DialogTitle>
          <DialogDescription>{tg("gl.rw.desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-sm font-bold leading-tight">{goal?.title}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {tg("gl.rw.completedState")}
            </p>
          </div>

          {state === "confirmed" && entry ? (
            <p className="flex items-center gap-2 rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">
              <Zap className="h-4 w-4" aria-hidden />
              <span>
                {tg("gl.rw.confirmed")}: +{entry.amount} XP
              </span>
            </p>
          ) : state === "unavailable" ? (
            <p role="status" className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              {tg("gl.rw.unavailable")}
            </p>
          ) : (
            <div role="status" aria-live="polite" className="rounded-2xl bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Hourglass className="h-4 w-4" aria-hidden />
                {tg("gl.rw.pending")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{tg("gl.rw.pendingDesc")}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {state === "confirmed" ? null : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full"
              onClick={() => void reload()}
              disabled={loading}
              aria-label={tg("gl.rw.retry")}
            >
              {tg("gl.rw.retry")}
            </Button>
          )}
          <Button
            type="button"
            className="min-h-11 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label={tg("gl.rw.close")}
          >
            {tg("gl.rw.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
