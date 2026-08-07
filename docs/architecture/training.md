# Training Architecture

Three distinct concerns that are frequently confused. They are separate on
purpose.

## 1. Workout generation — `WorkoutGeneratorService`

`src/services/workout-generator/`

Turns a **capability profile** (onboarding answers + assessment results +
available equipment + injuries) into one concrete workout:

- warm-up block, main exercise block, cooldown block
- exercise substitution when equipment or capability is missing
- estimated duration and MET-based calorie estimate
- difficulty tag

It is **deterministic**: same profile in, same workout out. It knows nothing
about weeks, scheduling, completion state or XP.

| Item  | Value                                                                   |
| ----- | ----------------------------------------------------------------------- |
| Rules | `workoutRules.ts` (pure)                                                |
| Types | `GeneratedWorkout`, `WorkoutExercise`, `WorkoutBlockItem`, `Difficulty` |
| Table | `generated_workouts`                                                    |

## 2. Training-plan generation — `TrainingPlanService` + `trainingPlanRules`

Builds the 28-day structure:

```
Week 1  Base       →  Week 2  Volume  →  Week 3  Intensity  →  Week 4  Deload
```

For each week it derives the objective, difficulty, workout/recovery day
counts and deload flag; for each training day it materialises a
`planned_workouts` row by delegating to the generator's rules. Persists to
`training_plans` → `training_weeks` → `training_days` → `planned_workouts`.

## 3. Training-plan execution (Runtime) — `trainingPlanRuntime.ts`

Owns _state over time_, not structure:

- **Lifecycle:** `active` · `paused` · `completed`
- **Workout state:** `locked` · `available` · `in_progress` · `completed` · `skipped`
- **Cursor:** `current_week` / `current_day`, `scheduled_date`,
  `next_workout_date`
- **Progress:** `completed_workouts`, `completed_weeks`, `progress_percentage`

Transitions: `startWorkout`, `completeWorkout`, `skipWorkout`, `advanceDay`,
`advanceWeek`, `pauseProgram`, `resumeProgram`, `restartProgram`. All of them
return the refreshed `CurrentProgramState` so the caller never has to re-read.

On completion the runtime **emits** a domain event to the Gamification
Orchestrator (dynamic import, so the training bundle does not statically pull
the gamification graph). It never awards XP itself.

## Hooks

```ts
useCurrentProgram()             // TanStack Query, key ["training-program","current"], 30s stale
useProgramActions(onSuccess?)   // mutations; each writes the returned state back into the cache
```

Hooks contain **no** training rules — they are a thin React binding over
`TrainingPlanService`.

## Flow

```
Onboarding + Assessment
        ↓
TrainingPlanService.regenerateProgram()
        ↓  (uses workout generation rules per day)
training_plans / training_weeks / training_days / planned_workouts
        ↓
useCurrentProgram()  →  Dashboard, /training-plan
        ↓
useProgramActions().completeWorkout()
        ↓
TrainingPlanService runtime  →  GamificationOrchestrator
```
