import { Link } from "@tanstack/react-router";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { CurrentProgramState } from "@/services/training-plan/trainingPlanTypes";
import { cn } from "@/lib/utils";
import { DashCard, Pill, ProgressBar, SectionTitle } from "./primitives";
import { PLAN_STATUS_LABEL, weekPhase } from "./dashboardFormat";

export function ProgramOverviewCard({
  state,
  busy,
  onPause,
  onResume,
  onRestart,
}: {
  state: CurrentProgramState;
  busy?: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}) {
  const { plan, overall, status, currentWeek } = state;
  const paused = status === "paused";
  const finished = status === "completed";

  return (
    <DashCard aria-labelledby="program-title">
      <SectionTitle
        action={
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest",
              finished
                ? "bg-accent/15 text-accent"
                : paused
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/15 text-primary",
            )}
          >
            {PLAN_STATUS_LABEL[status]}
          </span>
        }
      >
        Seu programa
      </SectionTitle>

      <h2 id="program-title" className="mt-2 truncate text-xl font-bold">
        {plan.programTitle}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Semana {plan.currentWeek} de {plan.totalWeeks} · Dia {plan.currentDay} ·{" "}
        {weekPhase(currentWeek)}
      </p>

      <div className="mt-4">
        <ProgressBar value={overall.percentage} label="Progresso do programa" />
        <p className="mt-2 text-xs text-muted-foreground">
          {overall.completedWorkouts} de {overall.totalWorkouts} treinos ({overall.percentage}%)
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {paused ? (
          <button
            type="button"
            disabled={busy}
            onClick={onResume}
            className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[11px] font-semibold disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" aria-hidden /> Retomar
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || finished}
            onClick={onPause}
            className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[11px] font-semibold disabled:opacity-50"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden /> Pausar
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onRestart}
          className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[11px] font-semibold disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reiniciar
        </button>
        <Link
          to="/training-plan"
          className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[11px] font-semibold"
        >
          Ver plano
        </Link>
      </div>
    </DashCard>
  );
}

export function WeeklyProgressCard({ state }: { state: CurrentProgramState }) {
  const { weekly, currentWeek } = state;
  if (!weekly) return null;
  return (
    <DashCard aria-labelledby="weekly-title">
      <SectionTitle
        action={<Pill>{weekPhase(currentWeek)}</Pill>}
      >
        Semana {weekly.weekNumber}
      </SectionTitle>
      <p id="weekly-title" className="sr-only">
        Progresso semanal
      </p>
      <div className="mt-3">
        <ProgressBar value={weekly.percentage} label="Progresso da semana" />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Concluídos" value={weekly.completedWorkouts} />
        <Stat label="Restantes" value={weekly.remainingWorkouts} />
        <Stat label="Recuperação" value={weekly.recoveryDays} />
        <Stat label="Conclusão" value={`${weekly.percentage}%`} />
      </dl>
    </DashCard>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-display text-xl leading-none">{value}</dd>
    </div>
  );
}
