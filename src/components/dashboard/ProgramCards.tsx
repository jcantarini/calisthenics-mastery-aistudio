import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { CurrentProgramState } from "@/services/training-plan/trainingPlanTypes";
import {
  ActionButton,
  DashCard,
  Pill,
  ProgressBar,
  SectionTitle,
  StatTile,
  StatusBadge,
  actionClasses,
} from "./primitives";
import { PLAN_STATUS_LABEL, weekPhase } from "./dashboardFormat";

export const ProgramOverviewCard = memo(function ProgramOverviewCard({
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
          <StatusBadge tone={finished ? "accent" : paused ? "muted" : "primary"}>
            {PLAN_STATUS_LABEL[status]}
          </StatusBadge>
        }
      >
        Seu programa
      </SectionTitle>

      <h2 id="program-title" className="mt-3 truncate text-xl font-bold leading-tight">
        {plan.programTitle}
      </h2>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Semana {plan.currentWeek} de {plan.totalWeeks} · Dia {plan.currentDay} ·{" "}
        {weekPhase(currentWeek)}
      </p>

      <div className="mt-5">
        <ProgressBar value={overall.percentage} label="Progresso do programa" />
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {overall.completedWorkouts} de {overall.totalWorkouts} treinos ({overall.percentage}%)
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {paused ? (
          <ActionButton disabled={busy} onClick={onResume}>
            <Play className="h-3.5 w-3.5" aria-hidden /> Retomar
          </ActionButton>
        ) : (
          <ActionButton disabled={busy || finished} onClick={onPause}>
            <Pause className="h-3.5 w-3.5" aria-hidden /> Pausar
          </ActionButton>
        )}
        <ActionButton disabled={busy} onClick={onRestart}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reiniciar
        </ActionButton>
        <Link to="/training-plan" className={actionClasses("outline")}>
          Ver plano
        </Link>
      </div>
    </DashCard>
  );
});

export const WeeklyProgressCard = memo(function WeeklyProgressCard({
  state,
}: {
  state: CurrentProgramState;
}) {
  const { weekly, currentWeek } = state;
  if (!weekly) return null;
  return (
    <DashCard aria-label="Progresso semanal">
      <SectionTitle action={<Pill>{weekPhase(currentWeek)}</Pill>}>
        Semana {weekly.weekNumber}
      </SectionTitle>

      <div className="mt-4">
        <ProgressBar value={weekly.percentage} label="Progresso da semana" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatTile as="dl" label="Concluídos" value={weekly.completedWorkouts} />
        <StatTile as="dl" label="Restantes" value={weekly.remainingWorkouts} />
        <StatTile as="dl" label="Recuperação" value={weekly.recoveryDays} />
        <StatTile as="dl" label="Conclusão" value={`${weekly.percentage}%`} />
      </dl>
    </DashCard>
  );
});
