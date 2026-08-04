// Gamification Orchestrator — the single entry point for gamification events.
//
// It NEVER calculates XP, levels or achievements. Each engine owns its own
// calculation and persistence; the orchestrator only coordinates the pipeline
// and folds the outputs into one consolidated, reusable result.
//
// Pipeline: XP -> Progression -> Achievements -> Training snapshot -> plugins
// (Goals, Nutrition, Notifications, AI Coach, Daily Rewards, Season Pass...).
// A failing stage never aborts the pipeline: partial results are returned.

import { supabase } from "@/integrations/supabase/client";
import { AchievementService } from "@/services/achievements";
import { ProgressionService } from "@/services/progression";
import { TrainingPlanService } from "@/services/training-plan/TrainingPlanService";
import { XPService } from "@/services/xp";
import { emitGamificationResult } from "./gamificationEvents";
import {
  emptyResult,
  finalize,
  toAchievementEvents,
  toXPEvents,
  withAchievements,
  withError,
  withPluginOutput,
  withProgression,
  withStats,
  withWeekly,
  withXP,
} from "./gamificationResults";
import type {
  GamificationEngines,
  GamificationEvent,
  GamificationPluginPort,
  GamificationResult,
} from "./gamificationTypes";

async function resolveUserId(userId?: string): Promise<string> {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user.id;
}

/** Runs a stage, converting any failure into a collected partial error. */
async function stage(
  result: GamificationResult,
  name: string,
  run: (current: GamificationResult) => Promise<GamificationResult>,
): Promise<GamificationResult> {
  try {
    return await run(result);
  } catch (error) {
    console.error(`[gamification] stage "${name}" failed`, error);
    return withError(result, name, error);
  }
}

export function createGamificationOrchestrator(engines: GamificationEngines) {
  const plugins: GamificationPluginPort[] = [...(engines.plugins ?? [])];

  async function process(event: GamificationEvent): Promise<GamificationResult> {
    const userId = await resolveUserId(event.userId);
    let result = emptyResult(event, userId);
    const scoped: GamificationEvent = { ...event, userId };

    // 1. XP Engine — owns amounts and idempotency.
    result = await stage(result, "xp", async (current) => {
      const awarded: { amount: number; currentXP: number; lifetimeXP: number }[] = [];
      for (const xpEvent of toXPEvents(scoped)) {
        const award = await engines.xp.awardXP(xpEvent);
        if (award.awarded) {
          awarded.push({
            amount: award.amount,
            currentXP: award.stats.currentXP,
            lifetimeXP: award.stats.lifetimeXP,
          });
        }
      }
      return withXP(current, awarded);
    });

    // 2. Progression Engine — owns levels.
    result = await stage(result, "progression", async (current) => {
      const level = await engines.progression.processXPUpdate({
        userId,
        xpEarned: current.xpEarned,
        source: scoped.type,
        metadata: scoped.metadata,
      });
      return withProgression(current, level);
    });

    // 3. Achievements Engine — owns unlocks (and their own XP rewards).
    result = await stage(result, "achievements", async (current) => {
      let next = current;
      for (const achievementEvent of toAchievementEvents(scoped)) {
        const unlocks = await engines.achievements.processEvent(userId, achievementEvent);
        next = withAchievements(next, unlocks);
      }
      return next;
    });

    // 4. Read-only snapshots for the consolidated result.
    result = await stage(result, "stats", async (current) =>
      withStats(current, await engines.progression.getPlayerStats(userId)),
    );
    result = await stage(result, "training", async (current) =>
      withWeekly(current, (await engines.training?.getWeeklyProgress(userId)) ?? null),
    );

    // 5. Future engines (Goals, Notifications, AI Coach, Rewards...).
    for (const plugin of plugins) {
      result = await stage(result, plugin.name, async (current) => {
        const output = await plugin.process(scoped, { userId, result: current });
        return withPluginOutput(current, plugin.name, output?.data, output?.messages);
      });
    }

    const consolidated = finalize(result);
    await emitGamificationResult(consolidated);
    return consolidated;
  }

  return {
    /** Register a future engine without touching the pipeline. */
    registerEngine(plugin: GamificationPluginPort): () => void {
      if (!plugins.some((p) => p.name === plugin.name)) plugins.push(plugin);
      return () => {
        const index = plugins.findIndex((p) => p.name === plugin.name);
        if (index >= 0) plugins.splice(index, 1);
      };
    },

    registeredEngines(): string[] {
      return plugins.map((p) => p.name);
    },

    processWorkoutCompleted(options: {
      plannedWorkoutId: string;
      userId?: string;
      isFirstWorkout?: boolean;
      payload?: GamificationEvent["payload"];
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "workout_completed",
        sourceId: options.plannedWorkoutId,
        userId: options.userId,
        isFirstWorkout: options.isFirstWorkout,
        payload: options.payload,
        metadata: options.metadata,
      });
    },

    processWeekCompleted(options: {
      planId: string;
      weekNumber: number;
      userId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "week_completed",
        sourceId: `${options.planId}:${options.weekNumber}`,
        userId: options.userId,
        metadata: { planId: options.planId, weekNumber: options.weekNumber, ...options.metadata },
      });
    },

    processProgramCompleted(options: {
      planId: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "program_completed",
        sourceId: options.planId,
        userId: options.userId,
        metadata: { planId: options.planId, ...options.metadata },
      });
    },

    processAssessmentCompleted(options?: {
      assessmentId?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "assessment_completed",
        sourceId: options?.assessmentId ?? options?.userId ?? null,
        userId: options?.userId,
        metadata: options?.metadata,
      });
    },

    processProfileCompleted(options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "profile_completed",
        sourceId: options?.userId ?? null,
        userId: options?.userId,
        metadata: options?.metadata,
      });
    },

    processGoalCompleted(options: {
      goalId: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<GamificationResult> {
      return process({
        type: "goal_completed",
        sourceId: options.goalId,
        userId: options.userId,
        metadata: options.metadata,
      });
    },

    /** Escape hatch for any event not covered by a dedicated method. */
    processCustomEvent(event: GamificationEvent): Promise<GamificationResult> {
      return process(event);
    },

    /**
     * Read-only consolidated snapshot (no engine mutation), so the Dashboard
     * can consume the orchestrator instead of the individual engines.
     */
    async getSnapshot(userId?: string): Promise<GamificationResult> {
      const uid = await resolveUserId(userId);
      let result = emptyResult({ type: "custom", userId: uid }, uid);

      result = await stage(result, "progression", async (current) => {
        const progression = await ProgressionServiceSnapshot(uid);
        return { ...current, ...progression };
      });
      result = await stage(result, "stats", async (current) =>
        withStats(current, await engines.progression.getPlayerStats(uid)),
      );
      result = await stage(result, "achievements", async (current) =>
        withAchievements(current, []),
      );
      result = await stage(result, "training", async (current) =>
        withWeekly(current, (await engines.training?.getWeeklyProgress(uid)) ?? null),
      );
      return result;
    },
  };
}

/** Level snapshot read through the Progression Engine (no math here). */
async function ProgressionServiceSnapshot(userId: string) {
  const [progression, snapshot] = await Promise.all([
    ProgressionService.getProgression(userId),
    ProgressionService.getProgressToNextLevel(userId),
  ]);
  return {
    currentXP: progression.currentXP,
    lifetimeXP: progression.lifetimeXP,
    oldLevel: progression.currentLevel,
    newLevel: progression.currentLevel,
    leveledUp: false,
    levelsGained: 0,
    isMaxLevel: snapshot.isMaxLevel,
    nextLevelXP: snapshot.levelSpan,
    xpToNextLevel: snapshot.xpRemaining,
    progressPercentage: snapshot.progressPercentage,
  };
}

/** Default instance wired to the real engines. */
export const GamificationOrchestrator = createGamificationOrchestrator({
  xp: XPService,
  progression: ProgressionService,
  achievements: AchievementService,
  training: TrainingPlanService,
});

export type GamificationOrchestratorInstance = ReturnType<typeof createGamificationOrchestrator>;
