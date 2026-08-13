import { useState } from "react";
import type { Goal, GoalProgress as GoalProgressData } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GoalProgress } from "./GoalProgress";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalDifficultyBadge } from "./GoalDifficultyBadge";
import { GoalTrackingBadge } from "./GoalTrackingBadge";
import {
  DESTRUCTIVE_ACTIONS,
  actionLabelKey,
  availableGoalActions,
  categoryLabelKey,
  formatDate,
  goalTrackingHintKey,
  type GoalAction,
} from "./goalPresentation";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Mobile-first goal details sheet. Actions are limited to the transitions the
 * Goals domain accepts for the current status.
 */
export function GoalDetails({
  goal,
  progress,
  open,
  pending,
  onOpenChange,
  onAction,
}: {
  goal: Goal | null;
  progress: GoalProgressData | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: GoalAction, goal: Goal) => void;
}) {
  const { tg, locale } = useGoalsT();
  const [confirming, setConfirming] = useState<GoalAction | null>(null);

  if (!goal || !progress) return null;

  const actions = availableGoalActions(goal);
  const unit = tg(`gl.unit.${goal.unit}`);

  const run = (action: GoalAction) => {
    if (DESTRUCTIVE_ACTIONS.has(action)) {
      setConfirming(action);
      return;
    }
    onAction(action, goal);
  };

  const confirmKey = confirming === "delete" ? "gl.confirmDelete" : "gl.confirmCancel";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          closeLabel={tg("gl.close")}
          className="max-h-[92dvh] overflow-y-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl leading-tight">{goal.title}</SheetTitle>
            <SheetDescription>{tg(categoryLabelKey(goal.category))}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <GoalStatusBadge status={goal.status} />
              <GoalTrackingBadge goal={goal} />
              <GoalDifficultyBadge difficulty={goal.difficulty} />
            </div>

            <GoalProgress goal={goal} progress={progress} />

            <p className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
              {tg(goalTrackingHintKey(goal))}
            </p>

            {goal.description ? (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tg("gl.description")}
                </h3>
                <p className="text-sm">{goal.description}</p>
              </div>
            ) : null}

            <dl>
              <Row label={tg("gl.target")} value={`${goal.targetValue}${unit ? ` ${unit}` : ""}`} />
              <Row label={tg("gl.startDate")} value={formatDate(goal.startDate, locale)} />
              <Row
                label={tg("gl.targetDate")}
                value={goal.targetDate ? formatDate(goal.targetDate, locale) : tg("gl.noDeadline")}
              />
              <Row label={tg("gl.createdAt")} value={formatDate(goal.createdAt, locale)} />
              {goal.completedAt ? (
                <Row label={tg("gl.completedAt")} value={formatDate(goal.completedAt, locale)} />
              ) : null}
            </dl>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tg("gl.actions")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    disabled={pending}
                    variant={DESTRUCTIVE_ACTIONS.has(action) ? "outline" : "default"}
                    className="min-h-11 flex-1 rounded-full"
                    onClick={() => run(action)}
                  >
                    {tg(actionLabelKey(action))}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && !pending && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tg(`${confirmKey}.title`)}</AlertDialogTitle>
            <AlertDialogDescription>{tg(`${confirmKey}.desc`)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{tg("gl.keep")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                if (pending) return;
                const action = confirming;
                setConfirming(null);
                if (action) onAction(action, goal);
              }}
            >
              {tg("gl.confirmYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
