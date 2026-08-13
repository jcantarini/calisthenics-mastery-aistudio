import { Flame, Mountain, Signal, Zap } from "lucide-react";
import type { GoalDifficulty } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { difficultyLabelKey, type BadgeTone } from "./goalPresentation";
import { Chip } from "./chip";

const META: Record<GoalDifficulty, { icon: typeof Zap; tone: BadgeTone }> = {
  easy: { icon: Signal, tone: "muted" },
  medium: { icon: Zap, tone: "primary" },
  hard: { icon: Flame, tone: "accent" },
  epic: { icon: Mountain, tone: "danger" },
};

/** Displays the difficulty declared by the domain. Never infers it. */
export function GoalDifficultyBadge({ difficulty }: { difficulty: GoalDifficulty }) {
  const { tg } = useGoalsT();
  const meta = META[difficulty] ?? META.medium;
  const Icon = meta.icon;
  return (
    <Chip
      tone={meta.tone}
      title={tg(`gl.diffHint.${difficulty}`)}
      icon={<Icon className="h-3.5 w-3.5" aria-hidden />}
    >
      <span className="sr-only">{tg("gl.difficulty")}: </span>
      {tg(difficultyLabelKey(difficulty))}
    </Chip>
  );
}
