import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingUp } from "lucide-react";
import { useLevelProgress } from "@/hooks/useGamification";
import { useT } from "@/lib/i18n";
import { DashCard, ProgressBar, SectionTitle, StatTile } from "./primitives";
import { buildPlayerLevelLabels } from "./playerLevelCard";

/**
 * Reusable Dashboard widget. Consumes only the consolidated gamification
 * result exposed by the Orchestrator — never XP/Progression/Achievement
 * services directly. This component only renders.
 */
export const PlayerLevelCard = memo(function PlayerLevelCard() {
  const { data: progress, loading } = useLevelProgress();
  const { locale } = useT();

  if (loading || !progress) return null;

  const labels = buildPlayerLevelLabels(locale, progress);

  return (
    <DashCard aria-label={labels.cardLabel}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{labels.title}</SectionTitle>
        <Link
          to="/jogador"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {labels.badge}
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold">{labels.currentXPValue}</span>
          <span className="text-right text-muted-foreground">{labels.nextTarget}</span>
        </div>
        <ProgressBar value={progress.progressPercentage} label={labels.progressLabel} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label={labels.lifetimeLabel}
          value={labels.lifetimeValue}
        />
        <StatTile
          as="dl"
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
          label={labels.remainingLabel}
          value={labels.remainingValue}
        />
        <StatTile
          as="dl"
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
          label={labels.nextLevelLabel}
          value={labels.nextLevelValue}
        />
      </dl>
    </DashCard>
  );
});
