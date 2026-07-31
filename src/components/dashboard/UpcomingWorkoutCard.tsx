import { CalendarClock } from "lucide-react";
import type { PlannedWorkout } from "@/services/training-plan/trainingPlanTypes";
import { DashCard, Pill, SectionTitle } from "./primitives";
import { dayLabel, muscleGroups } from "./dashboardFormat";

export function UpcomingWorkoutCard({ workout }: { workout: PlannedWorkout | null }) {
  if (!workout) return null;
  const focus = muscleGroups(workout, 3);
  return (
    <DashCard aria-labelledby="upcoming-title">
      <SectionTitle>Próximo treino</SectionTitle>
      <div className="mt-2 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p id="upcoming-title" className="truncate font-bold">
            {workout.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Semana {workout.weekNumber} · {dayLabel(workout.dayNumber)} · ~
            {workout.estimatedDurationMin} min
          </p>
        </div>
      </div>
      {focus.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {focus.map((f) => (
            <Pill key={f}>{f}</Pill>
          ))}
        </div>
      ) : null}
    </DashCard>
  );
}
