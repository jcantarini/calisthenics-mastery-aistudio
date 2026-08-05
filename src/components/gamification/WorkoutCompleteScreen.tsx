import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { DashCard, SectionTitle, ActionButton } from "@/components/dashboard/primitives";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { RewardSummaryCard } from "./RewardSummaryCard";
import { WorkoutRewardCard } from "./WorkoutRewardCard";
import type { GamificationResult } from "@/services/gamification";

/**
 * Premium workout completion screen. Sequential, restrained reveal.
 * Everything shown here comes from the Gamification Orchestrator result.
 */
export const WorkoutCompleteScreen = memo(function WorkoutCompleteScreen({
  result,
  nextWorkoutTitle,
  onContinue,
}: {
  result: GamificationResult;
  nextWorkoutTitle?: string | null;
  onContinue: () => void;
}) {
  const { locale } = useT();
  const reduce = useReducedMotion();

  const step = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.15 : 0.45,
      delay: reduce ? 0 : 0.08 * i,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-8 pt-6 sm:px-6">
      <motion.div {...step(0)} className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-3xl bg-primary/15 text-primary">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-3 text-display text-2xl">{tG(locale, "g.workoutComplete")}</h1>
      </motion.div>

      <motion.div {...step(1)}>
        <RewardSummaryCard result={result} />
      </motion.div>

      {result.newAchievements.length > 0 ? (
        <motion.div {...step(2)}>
          <WorkoutRewardCard unlocks={result.newAchievements} />
        </motion.div>
      ) : null}

      {nextWorkoutTitle ? (
        <motion.div {...step(3)}>
          <DashCard>
            <SectionTitle icon={<ChevronRight size={14} />}>
              {tG(locale, "g.nextWorkout")}
            </SectionTitle>
            <p className="mt-3 text-sm font-semibold">{nextWorkoutTitle}</p>
          </DashCard>
        </motion.div>
      ) : null}

      <motion.div {...step(4)}>
        <ActionButton variant="primary" className="w-full" onClick={onContinue} autoFocus>
          {tG(locale, "g.continue")}
        </ActionButton>
      </motion.div>
    </div>
  );
});
