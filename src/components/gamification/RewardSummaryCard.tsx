import { memo } from "react";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { DashCard, SectionTitle, StatTile } from "@/components/dashboard/primitives";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { LevelBadge } from "./badges";
import { XPProgressBar, WeeklyProgressBar, GoalProgressBar } from "./progress-bars";
import { CountUp } from "./CountUp";
import type { GamificationResult } from "@/services/gamification";

/**
 * Consolidated reward summary — XP, level, streak, week and next goal.
 * Consumes only the orchestrator result.
 */
export const RewardSummaryCard = memo(function RewardSummaryCard({
  result,
  title,
}: {
  result: GamificationResult;
  title?: string;
}) {
  const { locale } = useT();

  return (
    <DashCard aria-label={title ?? tG(locale, "g.workoutComplete")}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<Zap size={14} />}>
          {title ?? tG(locale, "g.workoutComplete")}
        </SectionTitle>
        <LevelBadge level={result.newLevel} />
      </div>

      <p className="mt-3 text-display text-5xl leading-none text-primary">
        <CountUp value={result.xpEarned} prefix="+" suffix=" XP" />
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {tG(locale, "g.xpEarned")}
      </p>

      <div className="mt-4">
        <XPProgressBar
          percentage={result.progressPercentage}
          currentXP={result.currentXP}
          nextLevelXP={result.nextLevelXP}
          isMaxLevel={result.isMaxLevel}
          label={tG(locale, "g.nextLevel")}
          maxLabel={tG(locale, "g.maxLevel")}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {result.isMaxLevel
            ? tG(locale, "g.maxLevel")
            : `${tG(locale, "g.toNextLevel")}: ${result.xpToNextLevel} XP`}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile as="dl" icon={<Flame className="h-3.5 w-3.5" aria-hidden />} label={tG(locale, "g.streak")} value={`${result.currentStreak} ${tG(locale, "g.days")}`} />
        <StatTile
          as="dl"
          icon={<Target className="h-3.5 w-3.5" aria-hidden />}
          label={tG(locale, "g.week")}
          value={
            result.weeklyProgress
              ? `${result.weeklyProgress.completedWorkouts}/${result.weeklyProgress.totalWorkouts}`
              : "—"
          }
        />
        <StatTile as="dl" icon={<Trophy className="h-3.5 w-3.5" aria-hidden />} label={tG(locale, "g.achievements")} value={result.newAchievements.length} />
      </dl>

      {result.weeklyProgress ? (
        <div className="mt-4">
          <WeeklyProgressBar
            completed={result.weeklyProgress.completedWorkouts}
            total={result.weeklyProgress.totalWorkouts}
            label={tG(locale, "g.weeklyProgress")}
          />
        </div>
      ) : null}

      {result.nextGoal ? (
        <div className="mt-4">
          <GoalProgressBar
            percentage={result.nextGoal.percentage}
            label={result.nextGoal.label}
            right={`${result.nextGoal.current}/${result.nextGoal.target}`}
          />
        </div>
      ) : null}
    </DashCard>
  );
});
