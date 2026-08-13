// Goals Home. Orchestration only: loading, filtering, selection and
// mutations all go through the existing Goals hooks and services.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { GoalService, buildGoalProgress } from "@/services/goals";
import type { CreateGoalInput, Goal, GoalProgress } from "@/services/goals";
import type { GoalProgressSignal } from "@/services/goals/goalEvents";
import { useGoalMutations, useGoals } from "@/hooks/useGoals";
import { useGoalsT } from "@/lib/goals-i18n";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/motion";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalCreationWizard } from "@/components/goals/GoalCreationWizard";
import { GoalDetails } from "@/components/goals/GoalDetails";
import { GoalCompletionRewardDialog } from "@/components/goals/GoalCompletionRewardDialog";
import { shouldPresentGoalCompletion } from "@/components/dashboard/goalsDashboard";
import { GoalsEmptyState } from "@/components/goals/GoalsEmptyState";
import { GoalsFilters } from "@/components/goals/GoalsFilters";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { GoalsSummary } from "@/components/goals/GoalsSummary";
import {
  GOAL_FILTERS,
  buildGoalsSummary,
  matchesFilter,
  sortGoalsForDisplay,
  type GoalAction,
  type GoalFilter,
} from "@/components/goals/goalPresentation";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Minhas metas — Objetivos de calistenia | Barra" },
      {
        name: "description",
        content:
          "Crie e acompanhe metas de treino: frequência, repetições, tempo de prancha, sequência de dias e habilidades.",
      },
      { property: "og:title", content: "Minhas metas — Objetivos de calistenia | Barra" },
      {
        property: "og:description",
        content: "Metas de frequência, força, tempo e habilidades com progresso acompanhado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoalsPage,
});

const ACTION_RUNNERS: Record<GoalAction, (goalId: string) => Promise<unknown>> = {
  activate: (id) => GoalService.activateGoal(id),
  pause: (id) => GoalService.pauseGoal(id),
  resume: (id) => GoalService.resumeGoal(id),
  cancel: (id) => GoalService.cancelGoal(id),
  duplicate: (id) => GoalService.duplicateGoal(id),
  delete: (id) => GoalService.deleteGoal(id),
};

const ACTION_TOASTS: Record<GoalAction, string> = {
  activate: "gl.toast.activated",
  pause: "gl.toast.paused",
  resume: "gl.toast.resumed",
  cancel: "gl.toast.cancelled",
  duplicate: "gl.toast.duplicated",
  delete: "gl.toast.deleted",
};

function GoalsPage() {
  const { tg } = useGoalsT();
  const { data: goals, loading, error, reload } = useGoals();
  const { pending, run } = useGoalMutations(reload);
  const [filter, setFilter] = useState<GoalFilter>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Goal whose completion reward presentation is open (authoritative XP ledger).
  const [rewardGoal, setRewardGoal] = useState<Goal | null>(null);

  // Canonical progress, computed once per goal by the domain helper.
  const progressById = useMemo(() => {
    const map = new Map<string, GoalProgress>();
    for (const goal of goals) map.set(goal.id, buildGoalProgress(goal));
    return map;
  }, [goals]);

  const summary = useMemo(
    () => buildGoalsSummary(goals, (goal) => progressById.get(goal.id)?.percentage ?? 0),
    [goals, progressById],
  );

  const counts = useMemo(() => {
    const result = {} as Record<GoalFilter, number>;
    for (const key of GOAL_FILTERS) result[key] = goals.filter((g) => matchesFilter(g, key)).length;
    return result;
  }, [goals]);

  const visible = useMemo(
    () => sortGoalsForDisplay(goals.filter((goal) => matchesFilter(goal, filter))),
    [goals, filter],
  );

  const selected = goals.find((goal) => goal.id === selectedId) ?? null;

  const handleAction = async (action: GoalAction, goal: Goal) => {
    if (pending) return;
    const result = await run(() => ACTION_RUNNERS[action](goal.id));
    if (result === null) {
      toast.error(tg("gl.error.action"));
      return;
    }
    toast.success(tg(ACTION_TOASTS[action]));
    if (action === "delete" || action === "cancel") setSelectedId(null);
  };

  // Manual progress goes through the canonical progress mutation only.
  // updateGoalProgress already evaluates completion — no parallel path here.
  const handleLogProgress = async (goal: Goal, signal: GoalProgressSignal): Promise<boolean> => {
    if (pending) return false;
    const updated = await run(() => GoalService.updateGoalProgress(goal.id, signal));
    if (!updated) {
      toast.error(tg("gl.error.action"));
      return false;
    }
    if (shouldPresentGoalCompletion(updated)) {
      // The completion dialog is the feedback here — no redundant toast.
      setRewardGoal(updated);
      return true;
    }
    toast.success(tg("gl.toast.progress"));
    return true;
  };

  // Creation goes through GoalService only; the wizard never touches the backend.
  const handleCreate = async (input: CreateGoalInput): Promise<boolean> => {
    if (pending) return false;
    const created = await run(() => GoalService.createGoal(input));
    if (!created) return false;
    setFilter("active");
    toast.success(tg("gl.toast.created"));
    return true;
  };

  const createCta = (
    <Button type="button" className="min-h-11 rounded-full" onClick={() => setWizardOpen(true)}>
      <Plus className="h-4 w-4" aria-hidden />
      {tg("gl.create")}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-10 pb-28 sm:px-6 sm:pt-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-display text-2xl">{tg("gl.title")}</h1>
          <p className="text-sm text-muted-foreground">{tg("gl.subtitle")}</p>
        </div>
        {createCta}
      </header>

      {loading ? (
        <GoalsSkeleton />
      ) : error ? (
        <ErrorState
          title={tg("gl.error.load")}
          description={tg("gl.error.desc")}
          retryLabel={tg("gl.error.retry")}
          onRetry={() => void reload()}
        />
      ) : (
        <>
          {goals.length > 0 ? (
            <FadeIn>
              <GoalsSummary summary={summary} />
            </FadeIn>
          ) : null}

          <GoalsFilters value={filter} onChange={setFilter} counts={counts} />

          {visible.length === 0 ? (
            <GoalsEmptyState
              filter={goals.length === 0 ? "all" : filter}
              action={goals.length === 0 ? createCta : undefined}
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((goal) => (
                <li key={goal.id}>
                  <GoalCard
                    goal={goal}
                    progress={progressById.get(goal.id) as GoalProgress}
                    onOpen={(g) => setSelectedId(g.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <GoalCreationWizard
        open={wizardOpen}
        pending={pending}
        onOpenChange={setWizardOpen}
        onCreate={handleCreate}
      />

      <GoalDetails
        goal={selected}
        progress={selected ? (progressById.get(selected.id) ?? null) : null}
        open={selected !== null}
        pending={pending}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onAction={(action, goal) => void handleAction(action, goal)}
        onLogProgress={handleLogProgress}
      />

      <GoalCompletionRewardDialog
        goal={rewardGoal}
        open={rewardGoal !== null}
        onOpenChange={(open) => !open && setRewardGoal(null)}
      />
    </div>
  );
}
