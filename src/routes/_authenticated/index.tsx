import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAppState } from "@/lib/store";
import { useCurrentProgram, useProgramActions } from "@/hooks/useTrainingProgram";
import { FadeIn } from "@/components/ui/motion";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { TodayWorkoutCard } from "@/components/dashboard/TodayWorkoutCard";
import { ProgramOverviewCard, WeeklyProgressCard } from "@/components/dashboard/ProgramCards";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { UpcomingWorkoutCard } from "@/components/dashboard/UpcomingWorkoutCard";
import { StatisticsCard, MotivationCard } from "@/components/dashboard/StatisticsCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  DashboardEmptyState,
  ProgramCompletedState,
} from "@/components/dashboard/DashboardEmptyState";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel — Seu treino de hoje | Barra" },
      {
        name: "description",
        content:
          "Painel inteligente de calistenia: treino do dia, progresso semanal, estatísticas e próximos treinos do seu programa personalizado.",
      },
      { property: "og:title", content: "Painel — Seu treino de hoje | Barra" },
      {
        property: "og:description",
        content:
          "Acompanhe seu programa de calistenia: treino do dia, progresso, sequência e próximos passos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: state, isLoading } = useCurrentProgram();
  const actions = useProgramActions();
  const [app] = useAppState();
  const navigate = useNavigate();

  // Presentation-only aggregation of locally logged sessions.
  const { trainingMinutes, caloriesBurned } = useMemo(() => {
    let sec = 0;
    let kcal = 0;
    for (const list of Object.values(app.workoutLog)) {
      for (const s of list) {
        sec += s.durationSec;
        kcal += s.kcalBurned;
      }
    }
    return { trainingMinutes: Math.round(sec / 60), caloriesBurned: kcal };
  }, [app.workoutLog]);

  const run = async (p: Promise<unknown>, msg: string) => {
    try {
      await p;
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const busy =
    actions.completeWorkout.isPending ||
    actions.skipWorkout.isPending ||
    actions.advanceDay.isPending ||
    actions.pauseProgram.isPending ||
    actions.resumeProgram.isPending ||
    actions.restartProgram.isPending;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6">
      <div className="space-y-4">
        <GreetingCard
          name={app.profile.name}
          initials={app.profile.initials}
          level={state?.plan.fitnessLevel}
          programTitle={state?.plan.programTitle}
          goal={state?.plan.primaryGoal}
        />

        {isLoading ? (
          <DashboardSkeleton />
        ) : !state ? (
          <DashboardEmptyState
            onGenerate={() => navigate({ to: "/training-plan" })}
            generating={false}
          />
        ) : (
          <>
            {state.status === "completed" ? (
              <ProgramCompletedState
                onRegenerate={() =>
                  run(actions.regenerateProgram.mutateAsync(), "Novo programa gerado!")
                }
                generating={actions.regenerateProgram.isPending}
              />
            ) : (
              <FadeIn delay={0.03}>
                <TodayWorkoutCard
                  workout={state.todayWorkout}
                  nextWorkout={state.nextWorkout}
                  busy={busy}
                  onStart={(id) => actions.startWorkout.mutate(id)}
                  onComplete={(id) =>
                    run(actions.completeWorkout.mutateAsync(id), "Treino concluído!")
                  }
                  onSkip={(id) => run(actions.skipWorkout.mutateAsync(id), "Treino pulado")}
                  onAdvanceDay={() =>
                    run(actions.advanceDay.mutateAsync(), "Avançou para o próximo dia")
                  }
                />
              </FadeIn>
            )}

            <FadeIn delay={0.06}>
              <ProgramOverviewCard
                state={state}
                busy={busy}
                onPause={() => run(actions.pauseProgram.mutateAsync(), "Programa pausado")}
                onResume={() => run(actions.resumeProgram.mutateAsync(), "Programa retomado")}
                onRestart={() => run(actions.restartProgram.mutateAsync(), "Programa reiniciado")}
              />
            </FadeIn>

            <FadeIn delay={0.09}>
              <WeeklyProgressCard state={state} />
            </FadeIn>

            <FadeIn delay={0.12}>
              <QuickActionsCard />
            </FadeIn>

            <FadeIn delay={0.15}>
              <UpcomingWorkoutCard workout={state.nextWorkout} />
            </FadeIn>

            <FadeIn delay={0.18}>
              <StatisticsCard
                overall={state.overall}
                trainingMinutes={trainingMinutes}
                caloriesBurned={caloriesBurned}
              />
            </FadeIn>

            <FadeIn delay={0.21}>
              <MotivationCard />
            </FadeIn>
          </>
        )}
      </div>
    </main>
  );
}
