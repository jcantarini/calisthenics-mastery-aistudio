import { memo } from "react";
import { CalendarClock } from "lucide-react";
import type { PlannedWorkout } from "@/services/training-plan/trainingPlanTypes";
import { CardIcon, DashCard, Pill, SectionTitle } from "./primitives";
import { dayLabel, muscleGroups } from "./dashboardFormat";

export const UpcomingWorkoutCard = memo(function UpcomingWorkoutCard({
  workout,
}: {
  workout: PlannedWorkout | null;
}) {
  if (!workout) return null;
  const focus = muscleGroups(workout, 3);
  return (
    <DashCard aria-labelledby="upcoming-title">
      <SectionTitle>Próximo treino</SectionTitle>
      <div className="mt-3 flex items-start gap-3">
        <CardIcon>
          <CalendarClock className="h-5 w-5" aria-hidden />
        </CardIcon>
        <div className="min-w-0">
          <p id="upcoming-title" className="truncate font-bold leading-tight">
            {workout.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Semana {workout.weekNumber} · {dayLabel(workout.dayNumber)} · ~
            {workout.estimatedDurationMin} min
          </p>
        </div>
      </div>
      {focus.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {focus.map((f) => (
            <Pill key={f}>{f}</Pill>
          ))}
        </div>
      ) : null}
    </DashCard>
  );
});
