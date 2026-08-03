import { memo } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { usePlayerLevel, usePlayerProgress } from "@/hooks/usePlayerProgression";
import { DashCard, ProgressBar, SectionTitle, StatTile } from "./primitives";

/**
 * Reusable Dashboard widget. All level math comes from ProgressionService
 * through hooks — this component only renders.
 */
export const PlayerLevelCard = memo(function PlayerLevelCard() {
  const { data: progression, loading } = usePlayerLevel();
  const { data: snapshot } = usePlayerProgress();

  if (loading || !progression || !snapshot) return null;

  return (
    <DashCard aria-label="Nível do jogador">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Nível</SectionTitle>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Nível {progression.currentLevel}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{snapshot.xpIntoLevel} XP</span>
          <span className="text-muted-foreground">
            {snapshot.isMaxLevel ? "Nível máximo" : `${snapshot.levelSpan} XP`}
          </span>
        </div>
        <ProgressBar
          value={snapshot.progressPercentage}
          label={`Progresso para o nível ${snapshot.level + 1}`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label="XP total"
          value={`${progression.lifetimeXP}`}
        />
        <StatTile
          as="dl"
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
          label="Faltam"
          value={snapshot.isMaxLevel ? "—" : `${snapshot.xpRemaining} XP`}
        />
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label="Próximo nível"
          value={snapshot.isMaxLevel ? "MAX" : `${snapshot.level + 1}`}
        />
      </dl>
    </DashCard>
  );
});
