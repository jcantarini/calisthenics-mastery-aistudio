# Data Flow

## Dependency direction

```
React Components  →  Hooks  →  Services / Orchestrators  →  Domain Rules  →  Supabase
```

Nothing points back upward. A service never imports a hook or a component; a
rule module never imports the Supabase client.

**This is a guideline, not a mandate to wrap every query.** A one-line
infrastructure call with no business meaning may live in the component.

## Read flow — Dashboard

```
index.tsx (route)
  → useCurrentProgram()          → TrainingPlanService.getCurrentProgress()
  → useGamification()            → GamificationOrchestrator.getSnapshot()
  → usePlayerProgression()       → ProgressionService
  → useAchievements()            → AchievementService
```

Training reads go through TanStack Query (`trainingProgramKey`, 30s stale
time). Gamification reads use a lightweight `useEffect` + event-bus
subscription and are refreshed by every orchestrated result.

## Write flow — completing a workout

```
Workout UI
  → useProgramActions().completeWorkout(workoutId)
  → TrainingPlanService.completeWorkout()
        · persists planned_workouts / training_days / training_plans progress
        · emits workout_completed to the Gamification Orchestrator
  → GamificationOrchestrator.processWorkoutCompleted()
        1. XPService.awardXP()             (owns amounts + idempotency)
        2. ProgressionService.processXPUpdate()   (owns levels)
        3. AchievementService.processEvent()      (owns unlocks)
        4. read-only stats + weekly snapshots
        5. registered plugins (future engines)
  → consolidated GamificationResult
  → emitGamificationResult() on the gamification bus
  → GamificationHost / WorkoutCompleteScreen / LevelUpModal / AchievementModal
```

A failing stage never aborts the pipeline: the failure is collected into
`result.errors` and the partial result is still returned and rendered.

## Event buses

| Bus                     | Publisher              | Subscriber                        |
| ----------------------- | ---------------------- | --------------------------------- |
| `xpEvents.ts`           | XPService              | ProgressionService                |
| `progressionEvents.ts`  | ProgressionService     | UI (level history / level-up)     |
| `achievementEvents.ts`  | AchievementService     | UI (achievement modal)            |
| `gamificationEvents.ts` | Orchestrator           | `useGamification`, GamificationHost |
