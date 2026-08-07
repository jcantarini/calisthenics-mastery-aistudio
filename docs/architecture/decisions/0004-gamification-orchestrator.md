# 0004 — Gamification Orchestrator

**Status:** Accepted (Sprint 6.6B) · Part of Core Architecture v1.0

## Context

After a workout, the UI needs one coherent payload: XP earned, new level,
progress to next level, unlocked achievements, weekly progress and the next
workout. Producing that from three independent engines inside a component
would have pushed coordination logic into the presentation layer, and a single
engine failure would have broken the whole reward screen.

## Decision

Introduce `GamificationOrchestrator` as the single entry point for
gamification-relevant domain events. It:

1. runs the pipeline XP → Progression → Achievements → snapshots → plugins;
2. folds every stage output into one `GamificationResult`;
3. wraps each stage so a failure is collected in `result.errors` and the
   pipeline continues with a partial result;
4. is constructed via `createGamificationOrchestrator(engines)` with engines
   injected as ports;
5. exposes `registerEngine(plugin)` for future engines.

The Orchestrator contains **no** XP amount, level formula or unlock condition.

## Reason

Coordination is a real responsibility and deserves a home — but ownership of
rules must stay in the engines, otherwise the "single source of truth" claim
for each engine becomes false. Ports/DI make the pipeline unit-testable with
fakes (13 tests), and partial-failure tolerance means a broken achievement
lookup never costs the user their XP screen.

## Consequences

- One consolidated result object drives every celebration surface.
- Future engines (Goals, Nutrition, Notifications, AI Coach) plug in without
  touching the pipeline.
- `GamificationResult` currently serves both "what just happened" and
  "current snapshot" (`getSnapshot()` returns neutral deltas). This overload is
  known and accepted for v1.0; splitting the types is deferred.
