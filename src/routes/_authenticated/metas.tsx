// Minimal validation surface for the Goals domain (Sprint 7.1).
// The polished Goals experience belongs to Sprint 7.4 — this screen only
// proves create / load / progress / complete / pause / resume end to end.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GoalService } from "@/services/goals";
import type { CreateGoalInput, Goal } from "@/services/goals";
import { buildGoalProgress } from "@/services/goals";
import { useGoalMutations, useGoals } from "@/hooks/useGoals";
import { FadeIn } from "@/components/ui/motion";

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

const PRESETS: { label: string; input: CreateGoalInput }[] = [
  {
    label: "20 treinos",
    input: {
      type: "workout_count",
      category: "fitness",
      progressType: "count",
      title: "Completar 20 treinos",
      targetValue: 20,
      unit: "workouts",
    },
  },
  {
    label: "10 barras",
    input: {
      type: "strength",
      category: "strength",
      progressType: "threshold",
      title: "Fazer 10 barras fixas",
      targetValue: 10,
      unit: "repetitions",
    },
  },
  {
    label: "Prancha 120s",
    input: {
      type: "duration",
      category: "fitness",
      progressType: "duration",
      title: "Segurar prancha por 120 segundos",
      targetValue: 120,
      unit: "seconds",
    },
  },
  {
    label: "Sequência 7 dias",
    input: {
      type: "streak",
      category: "consistency",
      progressType: "streak",
      title: "Manter 7 dias seguidos de treino",
      targetValue: 7,
      unit: "days",
    },
  },
  {
    label: "Parada de mão",
    input: {
      type: "skill",
      category: "skill",
      progressType: "boolean",
      title: "Conquistar a parada de mão",
      targetValue: 1,
      unit: "boolean",
    },
  },
];

function GoalsPage() {
  const { data: goals, loading, reload } = useGoals();
  const { pending, error, run } = useGoalMutations(reload);
  const [feedback, setFeedback] = useState<string | null>(null);

  const act = async (label: string, action: () => Promise<unknown>) => {
    const result = await run(action);
    setFeedback(result ? label : null);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-10 pb-24 sm:px-6 sm:pt-12">
      <header className="space-y-1">
        <h1 className="text-display text-2xl">Minhas metas</h1>
        <p className="text-muted-foreground text-sm">
          Crie metas e acompanhe o progresso. Experiência completa chega no próximo sprint.
        </p>
      </header>

      <FadeIn>
        <section className="border-border/60 bg-card/60 space-y-3 rounded-2xl border p-4">
          <h2 className="text-sm font-semibold">Criar meta</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={pending}
                onClick={() => act("Meta criada.", () => GoalService.createGoal(preset.input))}
                className="border-border/60 bg-background/60 hover:bg-accent/40 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </section>
      </FadeIn>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      ) : null}
      {feedback ? <p className="text-muted-foreground text-sm">{feedback}</p> : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando metas…</p>
      ) : goals.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma meta ainda. Crie a primeira acima.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} pending={pending} onAction={act} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GoalRow({
  goal,
  pending,
  onAction,
}: {
  goal: Goal;
  pending: boolean;
  onAction: (label: string, action: () => Promise<unknown>) => void;
}) {
  const progress = buildGoalProgress(goal);
  const step = goal.progressType === "duration" ? 30 : 1;

  return (
    <li className="border-border/60 bg-card/60 space-y-3 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{goal.title}</p>
          <p className="text-muted-foreground text-xs">
            {progress.rawValue} / {goal.targetValue} {goal.unit} · {goal.status}
          </p>
        </div>
        <span className="text-primary text-sm font-semibold">{progress.percentage}%</span>
      </div>

      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(goal.status === "active" || goal.status === "draft") && (
          <>
            <ActionButton
              disabled={pending}
              onClick={() =>
                onAction("Progresso registrado.", () =>
                  GoalService.updateGoalProgress(goal.id, {
                    source: "manual",
                    value: goal.progressType === "boolean" ? 1 : step,
                  }),
                )
              }
            >
              {goal.progressType === "boolean" ? "Conquistei" : `+${step}`}
            </ActionButton>
            <ActionButton
              disabled={pending}
              onClick={() => onAction("Meta concluída.", () => GoalService.completeGoal(goal.id))}
            >
              Concluir
            </ActionButton>
            <ActionButton
              disabled={pending}
              onClick={() => onAction("Meta pausada.", () => GoalService.pauseGoal(goal.id))}
            >
              Pausar
            </ActionButton>
          </>
        )}
        {goal.status === "paused" && (
          <ActionButton
            disabled={pending}
            onClick={() => onAction("Meta retomada.", () => GoalService.resumeGoal(goal.id))}
          >
            Retomar
          </ActionButton>
        )}
        {goal.status === "completed" && (
          <ActionButton
            disabled={pending}
            onClick={() => onAction("Meta duplicada.", () => GoalService.duplicateGoal(goal.id))}
          >
            Repetir meta
          </ActionButton>
        )}
        <ActionButton
          disabled={pending}
          onClick={() => onAction("Meta removida.", () => GoalService.deleteGoal(goal.id))}
        >
          Excluir
        </ActionButton>
      </div>
    </li>
  );
}

function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="border-border/60 bg-background/60 hover:bg-accent/40 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
    >
      {children}
    </button>
  );
}
