import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { onGamificationResult } from "@/services/gamification";
import type { GamificationResult } from "@/services/gamification";
import type { AchievementUnlockResult } from "@/services/achievements";
import { WorkoutCompleteScreen } from "./WorkoutCompleteScreen";
import { LevelUpModal } from "./LevelUpModal";
import { AchievementModal } from "./AchievementModal";

/**
 * Presentation host for the reward experience.
 * Subscribes to the orchestrator bus and sequences:
 *   Workout complete screen -> Level up -> Achievement modals.
 * Contains no business logic: it only decides what to show, never what happened.
 */
export function GamificationHost() {
  const reduce = useReducedMotion();
  const [result, setResult] = useState<GamificationResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "summary" | "levelup" | "achievements">("idle");
  const [queue, setQueue] = useState<AchievementUnlockResult[]>([]);

  useEffect(
    () =>
      onGamificationResult((next) => {
        // Goal completion reuses the same consolidated result: no dedicated
        // reward screen yet (Sprint 7.4 owns the Goals experience), only the
        // shared level-up and achievement celebrations.
        if (next.eventType === "goal_completed") {
          if (!next.leveledUp && next.newAchievements.length === 0) return;
          setResult(next);
          setQueue(next.newAchievements);
          setPhase(next.leveledUp ? "levelup" : "achievements");
          return;
        }
        // Only celebration-worthy events open the full screen experience.
        if (next.eventType !== "workout_completed" && next.eventType !== "program_completed") {
          return;
        }
        setResult(next);
        setQueue(next.newAchievements);
        setPhase("summary");
      }),
    [],
  );


  const advance = useCallback(() => {
    setPhase((current) => {
      if (current === "summary" && result?.leveledUp) return "levelup";
      if ((current === "summary" || current === "levelup") && queue.length > 0) {
        return "achievements";
      }
      return "idle";
    });
  }, [result, queue.length]);

  const closeAchievement = useCallback(() => {
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0) setPhase("idle");
      return rest;
    });
  }, []);

  useEffect(() => {
    if (phase === "idle") setResult(null);
  }, [phase]);

  return (
    <>
      <AnimatePresence>
        {phase === "summary" && result ? (
          <motion.div
            key="summary"
            role="dialog"
            aria-modal="true"
            aria-label="Workout rewards"
            className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 backdrop-blur-xl"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <WorkoutCompleteScreen result={result} onContinue={advance} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {result ? (
        <LevelUpModal
          open={phase === "levelup"}
          level={result.newLevel}
          levelsGained={result.levelsGained}
          currentXP={result.currentXP}
          nextLevelXP={result.nextLevelXP}
          progressPercentage={result.progressPercentage}
          isMaxLevel={result.isMaxLevel}
          onClose={advance}
        />
      ) : null}

      <AchievementModal
        open={phase === "achievements" && queue.length > 0}
        unlock={queue[0] ?? null}
        onClose={closeAchievement}
      />
    </>
  );
}
