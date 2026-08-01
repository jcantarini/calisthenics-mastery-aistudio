import { memo } from "react";
import { Flame, Quote, Timer, Trophy } from "lucide-react";
import type { OverallProgress } from "@/services/training-plan/trainingPlanTypes";
import { DashCard, SectionTitle, StatTile } from "./primitives";
import { formatMinutes, motivationOfTheDay } from "./dashboardFormat";

export const StatisticsCard = memo(function StatisticsCard({
  overall,
  trainingMinutes,
  caloriesBurned,
}: {
  overall: OverallProgress;
  trainingMinutes: number;
  caloriesBurned: number;
}) {
  return (
    <DashCard aria-label="Estatísticas">
      <SectionTitle>Estatísticas</SectionTitle>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        <StatTile
          as="dl"
          icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
          label="Sequência"
          value={`${overall.currentStreak}d`}
        />
        <StatTile
          as="dl"
          icon={<Trophy className="h-3.5 w-3.5" aria-hidden />}
          label="Treinos"
          value={overall.completedWorkouts}
        />
        <StatTile
          as="dl"
          icon={<Timer className="h-3.5 w-3.5" aria-hidden />}
          label="Tempo"
          value={formatMinutes(trainingMinutes)}
        />
        <StatTile
          as="dl"
          icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
          label="Calorias"
          value={`${caloriesBurned}`}
        />
        <StatTile
          as="dl"
          icon={<Trophy className="h-3.5 w-3.5" aria-hidden />}
          label="Semanas"
          value={`${overall.completedWeeks}/${overall.totalWeeks}`}
        />
      </dl>
    </DashCard>
  );
});

export const MotivationCard = memo(function MotivationCard() {
  return (
    <DashCard className="border-accent/30 bg-accent/5" aria-label="Motivação">
      <div className="flex items-start gap-3">
        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-sm font-medium leading-relaxed text-balance">{motivationOfTheDay()}</p>
      </div>
    </DashCard>
  );
});
