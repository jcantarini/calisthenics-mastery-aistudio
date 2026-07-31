import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Flame, Play, SkipForward, Timer } from "lucide-react";
import type { PlannedWorkout } from "@/services/training-plan/trainingPlanTypes";
import { DashCard, Pill, SectionTitle } from "./primitives";
import { DIFFICULTY_LABEL, WORKOUT_STATUS_LABEL, muscleGroups, dayLabel } from "./dashboardFormat";

/** Today's session. Pure presentation — actions are injected by the parent. */
export function TodayWorkoutCard({
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
        <SectionTitle>Hoje</SectionTitle>
        <p id="today-title" className="mt-2 text-lg font-bold">
          Dia de recuperação
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Descanse, hidrate-se e volte mais forte amanhã.
        </p>
        {nextWorkout ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Próximo: <span className="font-semibold text-foreground">{nextWorkout.name}</span> ·{" "}
            {dayLabel(nextWorkout.dayNumber)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onAdvanceDay}
          className="tap mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold"
        >
          <CalendarDays className="h-4 w-4" aria-hidden /> Avançar dia
        </button>
      </DashCard>
    );
  }

  if (done) {
    return (
      <DashCard className="border-accent/40" aria-labelledby="today-title">
        <SectionTitle>Hoje</SectionTitle>
        <div className="mt-2 flex items-center gap-2 text-accent">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          <p id="today-title" className="text-lg font-bold">Treino concluído</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Excelente trabalho. Priorize sono, proteína e alongamento na recuperação.
        </p>
        {nextWorkout ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Próximo treino
            </p>
            <p className="mt-1 font-bold">{nextWorkout.name}</p>
            <p className="text-xs text-muted-foreground">
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
        action={
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            {WORKOUT_STATUS_LABEL[workout.status]}
          </span>
        }
      >
        Treino de hoje
      </SectionTitle>

      <h2 id="today-title" className="mt-2 text-display text-2xl leading-tight">
        {workout.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{workout.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric icon={<Timer className="h-4 w-4" aria-hidden />} value={`${workout.estimatedDurationMin}`} unit="min" />
        <Metric icon={<Flame className="h-4 w-4" aria-hidden />} value={`${workout.estimatedCalories}`} unit="kcal" />
        <Metric value={`${workout.exercises.length}`} unit="exercícios" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill className="border-primary/40 text-primary">{DIFFICULTY_LABEL[workout.difficulty]}</Pill>
        {groups.map((g) => (
          <Pill key={g}>{g}</Pill>
        ))}
      </div>

      <Link
        to="/timer"
        onClick={() => workout.id && onStart(workout.id)}
        className="tap mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-glow"
      >
        <Play className="h-5 w-5 fill-current" strokeWidth={0} aria-hidden /> Iniciar treino
      </Link>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!workout.id || busy}
          onClick={() => workout.id && onComplete(workout.id)}
          className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-xs font-semibold disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Concluir
        </button>
        <button
          type="button"
          disabled={!workout.id || busy}
          onClick={() => workout.id && onSkip(workout.id)}
          className="tap inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-xs font-semibold disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" aria-hidden /> Pular
        </button>
      </div>
    </DashCard>
  );
}

function Metric({ icon, value, unit }: { icon?: React.ReactNode; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground">{icon}</div>
      <p className="text-display text-xl leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{unit}</p>
    </div>
  );
}
