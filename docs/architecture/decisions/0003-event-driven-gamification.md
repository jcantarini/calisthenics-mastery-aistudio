# 0003 — Event-Driven Gamification

**Status:** Accepted (Sprint 6.6B) · Part of Core Architecture v1.0

## Context

XP, levels and achievements are conceptually chained: earning XP can trigger a
level-up, which can trigger an achievement. Wiring the engines with direct
calls would make each engine depend on the next one, and the training domain
would need to know all three.

## Decision

Each engine publishes on its own in-process bus and subscribes to the ones it
cares about:

| Bus                  | Publisher          | Subscriber                          |
| -------------------- | ------------------ | ----------------------------------- |
| `xpEvents`           | XPService          | ProgressionService                  |
| `progressionEvents`  | ProgressionService | UI                                  |
| `achievementEvents`  | AchievementService | UI                                  |
| `gamificationEvents` | Orchestrator       | `useGamification`, GamificationHost |

Producers (training, assessment, onboarding) emit domain events; they never
call an engine's calculation.

## Reason

Decoupling keeps each engine independently testable and lets the presentation
layer subscribe to results without polling. Importing
`@/services/progression` self-registers the subscription, so wiring cannot be
forgotten.

## Consequences

- Adding a consumer requires no change to producers.
- Buses are in-process only — they do not survive a reload, so persisted state
  remains the source of truth and the buses are a live-update channel.
- Engines must stay idempotent, since events can be replayed. Enforced at the
  database level by unique constraints.
