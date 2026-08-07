import { memo, type ReactNode } from "react";
import { Dumbbell, Flame, Layers, Sparkles, Target, Timer, Trophy, Zap } from "lucide-react";
import { DashCard, SectionTitle, StatTile } from "@/components/dashboard/primitives";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { LevelBadge, StreakBadge } from "./badges";
import { XPProgressBar } from "./progress-bars";
import { CountUp } from "./CountUp";
import type { PlayerProfileStats } from "@/services/progression";

/**
 * Player card. Read-only: every value is provided by the progression /
 * gamification hooks, this component never computes anything.
 */
export const PlayerStatsCard = memo(function PlayerStatsCard({
  stats,
  nextLevelXP,
  isMaxLevel,
  name,
  workoutsCompleted,
  trainingMinutes,
  caloriesBurned,
  currentGoal,
  currentProgram,
}: {
  stats: PlayerProfileStats;
  nextLevelXP: number;
  isMaxLevel: boolean;
  name?: string;
  workoutsCompleted: number;
  trainingMinutes: number;
  caloriesBurned: number;
  currentGoal?: string | null;
  currentProgram?: string | null;
}) {
  const { locale } = useT();

  return (
    <DashCard aria-label={tG(locale, "g.playerProfile")}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<Sparkles size={14} />}>{tG(locale, "g.player")}</SectionTitle>
        <div className="flex items-center gap-2">
          <StreakBadge days={stats.currentStreak} />
          <LevelBadge level={stats.currentLevel} />
        </div>
      </div>

      {name ? <p className="mt-3 text-lg font-bold">{name}</p> : null}

      <p className="mt-2 text-display text-4xl leading-none text-primary">
        <CountUp value={stats.lifetimeXP} suffix=" XP" />
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {tG(locale, "g.lifetimeXP")}
      </p>

      <div className="mt-4">
        <XPProgressBar
          percentage={stats.progressPercentage}
          currentXP={stats.currentXP}
          nextLevelXP={nextLevelXP}
          isMaxLevel={isMaxLevel}
          label={tG(locale, "g.nextLevel")}
          maxLabel={tG(locale, "g.maxLevel")}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {isMaxLevel
            ? tG(locale, "g.maxLevel")
            : `${tG(locale, "g.toNextLevel")}: ${stats.xpRemaining} XP`}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile
          as="dl"
          icon={<Zap className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.currentXP")}
          value={stats.currentXP}
        />
        <StatTile
          as="dl"
          icon={<Trophy className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.achievements")}
          value={stats.achievementsUnlocked}
        />
        <StatTile
          as="dl"
          icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.streak")}
          value={`${stats.currentStreak} ${tG(locale, "g.days")}`}
        />
        <StatTile
          as="dl"
          icon={<Layers className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.programsCompleted")}
          value={stats.programsCompleted}
        />
        <StatTile
          as="dl"
          icon={<Dumbbell className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.workoutsCompleted")}
          value={workoutsCompleted}
        />
        <StatTile
          as="dl"
          icon={<Timer className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.trainingTime")}
          value={`${trainingMinutes} min`}
        />
        <StatTile
          as="dl"
          icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.caloriesBurned")}
          value={`${caloriesBurned} kcal`}
        />
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MetaRow
          icon={<Target className="h-4 w-4" aria-hidden />}
          label={tG(locale, "g.currentGoal")}
          value={currentGoal ?? "—"}
        />
        <MetaRow
          icon={<Layers className="h-4 w-4" aria-hidden />}
          label={tG(locale, "g.currentProgram")}
          value={currentProgram ?? "—"}
        />
      </div>
    </DashCard>
  );
});

function MetaRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
