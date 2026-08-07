# Domain Boundaries

Each domain owns its rules and its persistence. Cross-domain communication
happens through public service APIs or event buses — never by writing into
another domain's tables.

---

## Authentication

- **Responsibility:** session lifecycle, OAuth (Google/Apple), route gating.
- **Main modules:** `src/lib/auth.ts`, `src/routes/auth.tsx`,
  `src/routes/_authenticated/route.tsx`, `src/integrations/supabase/client.ts`.
- **Inputs:** OAuth callbacks, email/password credentials.
- **Outputs:** a Supabase session and `user.id` consumed by every other domain.
- **Dependencies:** Supabase Auth only.
- **MUST NOT:** own profile data, onboarding state, or any domain rule.

## Profile / Onboarding

- **Responsibility:** user profile record, 13-step onboarding, initial fitness
  assessment and its recommendation mapping.
- **Main modules:** `src/lib/onboarding.ts`, `src/lib/assessment.ts`,
  `src/routes/_authenticated/onboarding.tsx`, `.../assessment.tsx`, `.../perfil.tsx`.
- **Tables:** `profiles`, `user_onboarding`, `fitness_assessment`.
- **Outputs:** the capability profile consumed by Workout Generation, plus
  `assessment_completed` / `profile_completed` gamification events.
- **MUST NOT:** generate workouts, award XP, or compute levels — it emits
  events and lets the owning engines decide.

## Workout Generation

- **Responsibility:** turn a capability profile into a single concrete workout
  (warm-up, exercises, cooldown, substitutions, calorie estimate).
- **Main service:** `WorkoutGeneratorService` (`src/services/workout-generator/`).
- **Rules:** `workoutRules.ts` (pure, deterministic).
- **Types:** `GeneratedWorkout`, `WorkoutExercise`, `Difficulty`, `GenerateOptions`.
- **Tables:** `generated_workouts`.
- **MUST NOT:** know about weeks, plans, scheduling, progress or XP.

## Training (Plan Generation)

- **Responsibility:** build the 4-week / 28-day plan (Base → Volume →
  Intensity → Deload) from onboarding + assessment output.
- **Main service:** `TrainingPlanService` (`src/services/training-plan/`).
- **Rules:** `trainingPlanRules.ts`, `trainingPlanProgression.ts`.
- **Tables:** `training_plans`, `training_weeks`, `training_days`, `planned_workouts`.
- **MUST NOT:** compute XP or achievements.

## Training Runtime

- **Responsibility:** execution state of an active plan — start / complete /
  skip a workout, pause / resume / restart a program, advance day and week,
  progress percentages, weekly progress snapshot.
- **Main service:** `TrainingPlanService` (`trainingPlanRuntime.ts`).
- **Hook:** `useTrainingProgram` (`useCurrentProgram`, `useProgramActions`).
- **Outputs:** `CurrentProgramState`; emits `workout_completed`,
  `week_completed`, `program_completed` into the Gamification Orchestrator.
- **MUST NOT:** award XP itself; it reports the event and stops there.

## Dashboard

- **Responsibility:** presentation only. Aggregates read models from services
  through hooks.
- **Main modules:** `src/routes/_authenticated/index.tsx`, `src/components/dashboard/`.
- **MUST NOT:** contain any domain rule, threshold or formula.

## XP

- **Responsibility:** the single authority on how much XP an event is worth,
  idempotency of awards, and XP history.
- **Main service:** `XPService` (`src/services/xp/`), rules in `xpRules.ts`.
- **Tables:** `xp_history`, `user_stats`.
- **Bus:** `xpEvents.ts` (`onXPApplied`).
- **MUST NOT:** compute levels or unlock achievements.

## Player Progression (Levels)

- **Responsibility:** the level curve (100+ levels,
  `increment(n) = 25n² + 25n + 200`), level-up detection, level history.
- **Main service:** `ProgressionService` (`src/services/progression/`).
- **Rules:** `levelCurve.ts`, `levelRules.ts` (pure).
- **Tables:** `user_progression`, `level_history`.
- **Subscribes to:** the XP bus (`onXPApplied`).
- **MUST NOT:** decide XP amounts or achievement conditions.

## Achievements

- **Responsibility:** the achievement catalog and evaluation of boolean,
  cumulative, streak and duration models; unlock persistence and progress.
- **Main service:** `AchievementService` (`src/services/achievements/`).
- **Tables:** `achievements`, `user_achievements`, `user_achievement_progress`.
- **MUST NOT:** compute levels; it awards its own XP rewards through XPService.

## Gamification (Orchestration)

- **Responsibility:** be the single entry point for gamification-relevant
  domain events and fold engine outputs into one consolidated result.
- **Main module:** `GamificationOrchestrator` (`src/services/gamification/`).
- **Hooks:** `useGamification`, `useLevelProgress`, `useWorkoutRewards`.
- **MUST NOT:** calculate XP, levels or achievements. Ever.
