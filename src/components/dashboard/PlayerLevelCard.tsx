import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingUp } from "lucide-react";
import { useLevelProgress } from "@/hooks/useGamification";
import { DashCard, ProgressBar, SectionTitle, StatTile } from "./primitives";

/**
 * Reusable Dashboard widget. Consumes only the consolidated gamification
 * result exposed by the Orchestrator — never XP/Progression/Achievement
 * services directly. This component only renders.
 */
export const PlayerLevelCard = memo(function PlayerLevelCard() {
  const { data: progress, loading } = useLevelProgress();

  if (loading || !progress) return null;

  return (
    <DashCard aria-label="Nível do jogador">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Nível</SectionTitle>
        <Link
          to="/jogador"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Nível {progress.level}
        </Link>
      </div>


      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{progress.currentXP} XP</span>
          <span className="text-muted-foreground">
            {progress.isMaxLevel ? "Nível máximo" : `${progress.nextLevelXP} XP`}
          </span>
        </div>
        <ProgressBar
          value={progress.progressPercentage}
          label={`Progresso para o nível ${progress.level + 1}`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label="XP total"
          value={`${progress.lifetimeXP}`}
        />
        <StatTile
          as="dl"
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
          label="Faltam"
          value={progress.isMaxLevel ? "—" : `${progress.xpToNextLevel} XP`}
        />
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label="Próximo nível"
          value={progress.isMaxLevel ? "MAX" : `${progress.level + 1}`}
        />
      </dl>
    </DashCard>
  );
});
