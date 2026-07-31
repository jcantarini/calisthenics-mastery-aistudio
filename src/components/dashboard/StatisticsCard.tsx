import { Flame, Quote, Timer, Trophy } from "lucide-react";
import type { OverallProgress } from "@/services/training-plan/trainingPlanTypes";
import { DashCard, SectionTitle } from "./primitives";
import { formatMinutes, motivationOfTheDay } from "./dashboardFormat";

export function StatisticsCard({
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
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Item icon={<Flame className="h-4 w-4" aria-hidden />} label="Sequência" value={`${overall.currentStreak}d`} />
        <Item icon={<Trophy className="h-4 w-4" aria-hidden />} label="Treinos" value={overall.completedWorkouts} />
        <Item icon={<Timer className="h-4 w-4" aria-hidden />} label="Tempo" value={formatMinutes(trainingMinutes)} />
        <Item icon={<Flame className="h-4 w-4" aria-hidden />} label="Calorias" value={`${caloriesBurned}`} />
        <Item
          icon={<Trophy className="h-4 w-4" aria-hidden />}
          label="Semanas"
          value={`${overall.completedWeeks}/${overall.totalWeeks}`}
        />
      </dl>
    </DashCard>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <dt className="text-[10px] font-semibold uppercase tracking-widest">{label}</dt>
      </div>
      <dd className="mt-1.5 text-display text-xl leading-none">{value}</dd>
    </div>
  );
}

export function MotivationCard() {
  return (
    <DashCard className="border-accent/30 bg-accent/5" aria-label="Motivação">
      <div className="flex items-start gap-3">
        <Quote className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-sm font-medium leading-relaxed">{motivationOfTheDay()}</p>
      </div>
    </DashCard>
  );
}
