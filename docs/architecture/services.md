# Services

## API conventions (reviewed in Sprint 6.6B)

| Aspect        | Convention                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| Async         | Every persistence-touching method is `async` and returns a Promise.          |
| `userId`      | Optional trailing/first argument; when omitted the service resolves the current session user. |
| Return types  | Domain objects or explicit result objects. No raw Supabase `{ data, error }` leaks past a service. |
| Errors        | Services throw on unrecoverable failures. The Orchestrator converts stage failures into collected partial errors instead of aborting the pipeline. |
| Purity        | Rule modules (`*Rules.ts`, `levelCurve.ts`, `workoutRules.ts`) are pure and independently unit-testable. |
| Side effects  | Engines publish on their own event bus; consumers subscribe. No engine calls another engine directly except via a documented port. |

## WorkoutGeneratorService

```ts
generateFirstWorkout(userId: string, opts?: { weightKg?: number }): Promise<GeneratedWorkout>
getFirstWorkout(userId: string): Promise<GeneratedWorkout | null>
```

Deterministic given the same capability profile. No scheduling awareness.

## TrainingPlanService

The single source of truth for training-plan generation **and** runtime.

Generation / read:
```ts
getCurrentProgress(userId?): Promise<CurrentProgramState | null>
getWeeklyProgress(userId?): Promise<WeeklyProgress | null>
regenerateProgram(userId?): Promise<TrainingPlan>
```

Runtime transitions (all return the refreshed `CurrentProgramState`):
```ts
startWorkout(workoutId), completeWorkout(workoutId), skipWorkout(workoutId)
pauseProgram(), resumeProgram(), restartProgram()
advanceDay(), advanceWeek()
```

`regenerateTrainingPlan()` is a retained `@deprecated` alias of
`regenerateProgram()`; kept for backward compatibility, not for new code.

## XPService

```ts
awardXP(event: XPEvent): Promise<{ awarded: boolean; amount: number; stats: UserStats }>
```

Idempotent per `(userId, eventType, sourceId)`. Publishes `onXPApplied`.

## ProgressionService

```ts
processXPUpdate({ userId, xpEarned, source, metadata }): Promise<LevelUpResult>
getProgression(userId): Promise<PlayerProgression>
getProgressToNextLevel(userId): Promise<LevelSnapshot>
getPlayerStats(userId): Promise<PlayerProfileStats>
```

Subscribes to the XP bus on module import (`registerProgressionEngine()`).

## AchievementService

```ts
processEvent(userId, event: AchievementEvent): Promise<UnlockedAchievement[]>
```

Evaluates boolean / cumulative / streak / duration models and persists both
unlocks and partial progress.

## GamificationOrchestrator

```ts
processWorkoutCompleted({ plannedWorkoutId, userId?, isFirstWorkout?, payload?, metadata? })
processWeekCompleted({ planId, weekNumber, ... })
processProgramCompleted({ planId, ... })
processAssessmentCompleted(...), processProfileCompleted(...), processGoalCompleted(...)
processCustomEvent(event: GamificationEvent)
getSnapshot(userId?): Promise<GamificationResult>   // read-only, no mutation
registerEngine(plugin: GamificationPluginPort): () => void
```

All methods resolve to one consolidated `GamificationResult`. The Orchestrator
is constructed through `createGamificationOrchestrator(engines)` (ports/DI),
which is what makes the pipeline unit-testable with fake engines.
