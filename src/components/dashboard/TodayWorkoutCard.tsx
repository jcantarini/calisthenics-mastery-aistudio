import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Flame, Play, SkipForward, Timer } from "lucide-react";
import type { PlannedWorkout } from "@/services/training-plan/trainingPlanTypes";
import {
  ActionButton,
  CardIcon,
  DashCard,
  Pill,
  SectionTitle,
  StatusBadge,
  actionClasses,
} from "./primitives";
import { DIFFICULTY_LABEL, WORKOUT_STATUS_LABEL, muscleGroups, dayLabel } from "./dashboardFormat";

/** Today's session. Pure presentation — actions are injected by the parent. */
export const TodayWorkoutCard = memo(function TodayWorkoutCard({
  workout,
  nextWorkout,
  busy,
  onStart,
  onComplete,
  onSkip,
  onAdvanceDay,
}: {
  workout: PlannedWorkout | null;
  nextWorkout: PlannedWorkout | null;
  busy?: boolean;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onAdvanceDay: () => void;
}) {
  const done = workout?.status === "completed";
  const groups = muscleGroups(workout);

  if (!workout) {
    return (
      <DashCard aria-labelledby="today-title">
        <SectionTitle action={<StatusBadge tone="muted">Descanso</StatusBadge>}>Hoje</SectionTitle>
        <div className="mt-3 flex items-start gap-3">
          <CardIcon tone="muted">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </CardIcon>
          <div className="min-w-0">
            <p id="today-title" className="text-lg font-bold leading-tight">
              Dia de recuperação
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Descanse, hidrate-se e volte mais forte amanhã.
            </p>
          </div>
        </div>
        {nextWorkout ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Próximo: <span className="font-semibold text-foreground">{nextWorkout.name}</span> ·{" "}
            {dayLabel(nextWorkout.dayNumber)}
          </p>
        ) : null}
        <div className="mt-5">
          <ActionButton onClick={onAdvanceDay}>
            <CalendarDays className="h-4 w-4" aria-hidden /> Avançar dia
          </ActionButton>
        </div>
      </DashCard>
    );
  }

  if (done) {
    return (
      <DashCard className="border-accent/40" aria-labelledby="today-title">
        <SectionTitle action={<StatusBadge tone="accent">Concluído</StatusBadge>}>Hoje</SectionTitle>
        <div className="mt-3 flex items-start gap-3">
          <CardIcon tone="accent" className="animate-celebrate">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </CardIcon>
          <div className="min-w-0">
            <p id="today-title" className="text-lg font-bold leading-tight text-accent">
              Treino concluído
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Excelente trabalho. Priorize sono, proteína e alongamento na recuperação.
            </p>
          </div>
        </div>
        {nextWorkout ? (
          <div className="mt-5 rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Próximo treino
            </p>
            <p className="mt-1.5 truncate font-bold">{nextWorkout.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dayLabel(nextWorkout.dayNumber)} · ~{nextWorkout.estimatedDurationMin} min
            </p>
          </div>
        ) : null}
      </DashCard>
    );
  }

  return (
    <DashCard className="border-primary/30" aria-labelledby="today-title">
      <SectionTitle
        action={<StatusBadge>{WORKOUT_STATUS_LABEL[workout.status]}</StatusBadge>}
      >
        Treino de hoje
      </SectionTitle>

      <h2 id="today-title" className="mt-3 text-display text-2xl leading-tight sm:text-3xl">
        {workout.name}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{workout.description}</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Metric
          icon={<Timer className="h-4 w-4" aria-hidden />}
          value={`${workout.estimatedDurationMin}`}
          unit="min"
        />
        <Metric
          icon={<Flame className="h-4 w-4" aria-hidden />}
          value={`${workout.estimatedCalories}`}
          unit="kcal"
        />
        <Metric value={`${workout.exercises.length}`} unit="exercícios" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone="primary">{DIFFICULTY_LABEL[workout.difficulty]}</Pill>
        {groups.map((g) => (
          <Pill key={g}>{g}</Pill>
        ))}
      </div>

      <Link
        to="/timer"
        onClick={() => workout.id && onStart(workout.id)}
        className={actionClasses("primary", "mt-5 flex min-h-14 w-full text-base")}
      >
        <Play className="h-5 w-5 fill-current" strokeWidth={0} aria-hidden /> Iniciar treino
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          disabled={!workout.id || busy}
          onClick={() => workout.id && onComplete(workout.id)}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Concluir
        </ActionButton>
        <ActionButton
          disabled={!workout.id || busy}
          onClick={() => workout.id && onSkip(workout.id)}
        >
          <SkipForward className="h-4 w-4" aria-hidden /> Pular
        </ActionButton>
      </div>
    </DashCard>
  );
});

function Metric({ icon, value, unit }: { icon?: React.ReactNode; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <div className="flex h-4 items-center justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1.5 text-display text-xl leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
        {unit}
      </p>
    </div>
  );
}
