import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useCurrentProgram, useProgramActions } from "@/hooks/useTrainingProgram";
import { cn } from "@/lib/utils";
import type { WorkoutStatus } from "@/services/training-plan/trainingPlanTypes";

const STATUS_LABEL: Record<WorkoutStatus, string> = {
  locked: "Bloqueado",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluído",
  skipped: "Pulado",
  missed: "Perdido",
};

/** Runtime card: everything comes pre-computed from TrainingPlanService. */
export function CurrentProgramCard() {
  const { data: state, isLoading } = useCurrentProgram();
  const actions = useProgramActions();

  if (isLoading) {
    return <div className="mt-6 h-40 animate-pulse rounded-3xl border border-border/60 bg-surface" />;
  }
  if (!state) return null;

  const { plan, weekly, overall, todayWorkout, nextWorkout, status } = state;
  const target = todayWorkout ?? nextWorkout;
  const paused = status === "paused";
  const finished = status === "completed";

  const run = async (p: Promise<unknown>, msg: string) => {
    try {
      await p;
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-primary/30 bg-surface-elevated p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Seu programa
          </p>
          <h2 className="mt-1 truncate text-xl font-bold">{plan.programTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Semana {plan.currentWeek} de {plan.totalWeeks} · Dia {plan.currentDay}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest",
            finished
              ? "bg-accent/15 text-accent"
              : paused
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary",
          )}
        >
          {finished ? "Concluído" : paused ? "Pausado" : "Ativo"}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
          style={{ width: `${overall.percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {overall.completedWorkouts} de {overall.totalWorkouts} treinos ({overall.percentage}%) ·{" "}
        {weekly ? `${weekly.remainingWorkouts} restantes nesta semana` : "—"} · Sequência{" "}
        {overall.currentStreak}d
      </p>

      {target ? (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {todayWorkout ? "Treino de hoje" : "Próximo treino"}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {STATUS_LABEL[target.status]}
            </span>
          </div>
          <p className="mt-1 font-bold">{target.name}</p>
          <p className="text-xs text-muted-foreground">
            {target.exercises.length} exercícios · ~{target.estimatedDurationMin} min ·{" "}
            {target.estimatedCalories} kcal
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/timer"
              onClick={() => target.id && actions.startWorkout.mutate(target.id)}
              className="tap inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <Play className="h-3.5 w-3.5" /> Iniciar
            </Link>
            <button
              type="button"
              disabled={!target.id || actions.completeWorkout.isPending}
              onClick={() =>
                target.id &&
                run(actions.completeWorkout.mutateAsync(target.id), "Treino concluído!")
              }
              className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
            </button>
            <button
              type="button"
              disabled={!target.id || actions.skipWorkout.isPending}
              onClick={() => target.id && run(actions.skipWorkout.mutateAsync(target.id), "Treino pulado")}
              className="tap inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5" /> Pular
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="text-sm font-medium">Dia de recuperação</p>
          <button
            type="button"
            onClick={() => run(actions.advanceDay.mutateAsync(), "Avançou para o próximo dia")}
            className="tap mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Avançar dia
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {paused ? (
          <button
            type="button"
            onClick={() => run(actions.resumeProgram.mutateAsync(), "Programa retomado")}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
          >
            <Play className="h-3 w-3" /> Retomar
          </button>
        ) : (
          <button
            type="button"
            disabled={finished}
            onClick={() => run(actions.pauseProgram.mutateAsync(), "Programa pausado")}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
          >
            <Pause className="h-3 w-3" /> Pausar
          </button>
        )}
        <button
          type="button"
          onClick={() => run(actions.restartProgram.mutateAsync(), "Programa reiniciado")}
          className="tap inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
        >
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
        <Link
          to="/training-plan"
          className="tap inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
        >
          Ver plano
        </Link>
      </div>
    </section>
  );
}
