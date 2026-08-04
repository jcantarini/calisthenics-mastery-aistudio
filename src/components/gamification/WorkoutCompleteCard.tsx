import { memo } from "react";
import { Flame, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import {
  DashCard,
  CardIcon,
  ProgressBar,
  SectionTitle,
  StatTile,
} from "@/components/dashboard/primitives";
import type { GamificationResult } from "@/services/gamification";

/**
 * Reusable Workout Complete experience. Pure presentation: every value comes
 * from the consolidated result produced by the Gamification Orchestrator.
 */
export const WorkoutCompleteCard = memo(function WorkoutCompleteCard({
  result,
  title = "Treino concluído!",
}: {
  result: GamificationResult;
  title?: string;
}) {
  const { locale } = useT();

  return (
    <DashCard aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<Sparkles size={14} />}>{title}</SectionTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Zap className="h-3.5 w-3.5" aria-hidden />+{result.xpEarned} XP
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            Nível {result.newLevel}
            {result.leveledUp ? ` (+${result.levelsGained})` : ""}
          </span>
          <span className="text-muted-foreground">
            {result.isMaxLevel ? "Nível máximo" : `Faltam ${result.xpToNextLevel} XP`}
          </span>
        </div>
        <ProgressBar
          value={result.progressPercentage}
          label={`Progresso para o nível ${result.newLevel + 1}`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile
          as="dl"
          icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
          label="Sequência"
          value={`${result.currentStreak} d`}
        />
        <StatTile
          as="dl"
          icon={<Target className="h-3.5 w-3.5" aria-hidden />}
          label="Semana"
          value={
            result.weeklyProgress
              ? `${result.weeklyProgress.completedWorkouts}/${result.weeklyProgress.totalWorkouts}`
              : "—"
          }
        />
        <StatTile
          as="dl"
          icon={<Trophy className="h-3.5 w-3.5" aria-hidden />}
          label="Conquistas"
          value={`${result.newAchievements.length}`}
        />
      </dl>

      {result.newAchievements.length > 0 && (
        <ul className="mt-4 space-y-3">
          {result.newAchievements.map((unlock) => (
            <li key={unlock.achievement.id} className="flex items-center gap-3">
              <CardIcon>
                <Trophy size={16} />
              </CardIcon>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{tAch(locale, unlock.titleKey)}</p>
                <p className="truncate text-xs text-muted-foreground">+{unlock.xpEarned} XP</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.nextGoal && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Próxima meta · {result.nextGoal.label}
          </p>
          <ProgressBar value={result.nextGoal.percentage} label={result.nextGoal.label} />
        </div>
      )}
    </DashCard>
  );
});
