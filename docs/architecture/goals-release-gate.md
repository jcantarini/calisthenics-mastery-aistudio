# Goals Release Gate — Phase 7 (Sprints 7.1–7.5)

Permanent release document for the Goals domain. It records what was validated,
how it was validated, and what was explicitly left out. It is updated only with
results actually produced by running the validation commands below.

## 1. Validated scope

| Sprint | Scope                                                              |
| ------ | ------------------------------------------------------------------ |
| 7.1    | Goals Core: model, rules, validation, events, persistence, hooks   |
| 7.2    | Automatic tracking + persistent idempotency ledger                 |
| 7.3    | Goals × Gamification bridge (XP / progression / achievements)      |
| 7.3B   | Goal reward recovery (deterministic XP source reconciliation)      |
| 7.4A   | Goals Home UI, cards, details, filters, tracking capability badges |
| 7.4B   | Creation wizard, templates, manual progress, Dashboard integration |
| 7.5A   | Accessibility, keyboard, localized numeric input, async resilience |
| 7.5B   | Integrated audit, release contract tests, documentation, this gate |

## 2. Architectural invariants (audited)

```
UI → hooks → GoalService → pure rules → persistence → events → tracking/gamification
```

- No component or hook imports the Supabase client; persistence is reached only
  through `GoalService` (and, for tracking, its injected ports).
- Hooks contain no domain rules: `useGoals` only models async state.
- Progress percentages and completion come exclusively from `goalRules`
  (`foldProgress`, `isGoalCompleted`, `buildGoalProgress`). The UI renders them.
- Goals never compute XP; XP amounts live in `src/services/xp/xpRules.ts`.
- Tracking never awards rewards and never writes `user_goals` directly.
- Reward UI shows only values persisted in the XP ledger; when the entry cannot
  be read it renders a pending state.
- `registerGoalGamification()` is idempotent and effectively registered once
  (barrel import); a second call is a no-op.
- Creation, manual progress and automatic tracking share one completion path
  (`GoalService.updateGoalProgress` → `completeGoal`); there is no parallel one.
- Duplicate events are idempotent (ledger unique key, XP source uniqueness,
  optimistic status guard).
- Raw database errors never reach the UI; failures surface as `GoalError`.

No violation of these invariants was found during the Sprint 7.5B audit, and no
production code change was required.

## 3. Integrated flows covered

- Creation from a template and from a custom kind.
- Lifecycle: draft → active → paused → active; cancel, delete, duplicate.
- Manual progress: validation, preview, single application, completion.
- Automatic tracking: matching, ignoring, duplicate suppression, concurrency.
- Completion → `goal_completed` → gamification bridge → orchestrator.
- Reward recovery reconciliation and its idempotency.
- Dashboard reads: spotlight state and recent goal rewards from the ledger.

## 4. Security and RLS (existing, unchanged)

- `public.user_goals` and `public.goal_progress_events`: RLS enabled, a single
  `FOR ALL TO authenticated` policy scoped to `auth.uid() = user_id`, Data API
  grants for `authenticated` and `service_role` only (no `anon`).
- `user_id` is always resolved from the session, never taken from client input.
- No migration, policy, grant or Edge Function was changed in Sprint 7.5B.

## 5. Idempotency guarantees

| Mechanism                                             | Protects against                        |
| ----------------------------------------------------- | --------------------------------------- |
| `UNIQUE(goal_id, source_event_id, source_event_type)` | duplicate activity delivery             |
| Optimistic `.eq("status", previous)` guard            | double transition / double completion   |
| Compare-and-set on `current_value` + retry            | lost concurrent progress updates        |
| `goal_completed:<goalId>` XP source uniqueness        | duplicate XP, levels, unlocks           |
| Single-flight submission guard (wizard)               | duplicate goal creation from one intent |

## 6. Tracking matrix

| Goal type                         | Mode                                              |
| --------------------------------- | ------------------------------------------------- |
| `workout_count`                   | auto                                              |
| `workout_frequency`               | auto                                              |
| `training_time`                   | auto                                              |
| `streak`                          | auto                                              |
| `program`                         | auto                                              |
| `strength`, `duration`            | auto with `metadata.exerciseId`, else pending     |
| `skill`                           | auto with `metadata.skillId`, else pending        |
| `body_weight`, `body_measurement` | auto with `metadata.measurementKey`, else pending |
| `custom`                          | manual                                            |

`pending` means: no authoritative producer exists yet, so the user logs progress
manually and the badge says so instead of promising automation.

## 7. Languages

Portuguese, English, Italian, Spanish, French. Parity is enforced at compile
time (`satisfies Record<GoalsKey, string>`) and by tests over every dynamic key
family, with two documented intentionally empty strings (`gl.unit.boolean`,
`gl.ck.q.done`, plus the target question of boolean templates).

## 8. UX and accessibility checklist

Automated (covered by the release contract tests and pure unit tests):

- [x] Filters expose button-group semantics, not tabs.
- [x] Radio groups keep exactly one tabbable option.
- [x] Keyboard: arrows, Home, End, Enter, Space.
- [x] Wizard routes each invalid field to the step that owns it and focuses it.
- [x] Numeric parser accepts comma and period; presets are bounds/step valid.
- [x] Async `onChanged` is awaited before `pending` clears.
- [x] A failed refresh preserves usable data.
- [x] Selection state is conveyed by `aria-pressed`/`aria-checked`, not colour only.
- [x] Five-locale key parity, no unexpected empty strings.

Manual browser walkthrough (`/metas` at 360 px, 390 px and desktop; filters,
template creation, custom creation, invalid-field correction, manual progress,
completion, reward dialog, pause/resume/cancel/duplicate/delete, return to
Dashboard; focus visibility, keyboard-only navigation, bottom-nav/safe-area
overlap, dialog dismissal during mutation):

- **NOT EXECUTED.** The signed-in preview account is held by the onboarding
  gate: `/_authenticated` redirects to `/assessment` until a fitness assessment
  row exists, so `/metas` cannot be reached in the preview. Completing the
  assessment would write real fitness data into the user's account, which is out
  of scope for this sprint. These items must be re-checked manually by an
  account that has finished onboarding.

## 9. Validation commands

```bash
bun install --frozen-lockfile
bun run typecheck
bun run test:run
bun run lint
bun run build
```

## 10. Results (Sprint 7.5B run)

| Check                       | Result                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Bun                         | 1.3.3                                                                               |
| `install --frozen-lockfile` | success, no lockfile change                                                         |
| `typecheck`                 | 0 errors                                                                            |
| `test:run`                  | 343 passed / 343 (22 files)                                                         |
| `lint`                      | 0 errors, 13 warnings                                                               |
| `build`                     | client + SSR + Nitro completed, no Rolldown panic                                   |
| `bun.lock` SHA-256          | `184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058` before and after |
| Other lockfiles             | none                                                                                |
| Dependency changes          | none                                                                                |
| Database / infra            | unchanged                                                                           |

## 11. Known warnings (non-blocking)

- 13 pre-existing `react-refresh/only-export-components` warnings (UI primitives,
  i18n, theme, PWA providers).
- Vite chunk-size advisories on large vendor bundles.
- Console noise emitted deliberately by failure-isolation tests.

## 12. Explicitly out of scope

New goal categories; new skill or body-measurement producers; new XP formulas;
new achievements; notifications; analytics; social sharing; visual redesign; new
migrations; new dependencies; any Phase 8 feature.

## 13. Future considerations

- Authoritative producers for skill and body-measurement events would move those
  goal types from `pending` to `auto`.
- Component-level interaction tests would need a DOM testing library, which is
  intentionally not added here.
- A seeded, onboarding-complete preview account would make the manual UX
  walkthrough reproducible.

## 14. Final decision

**PARTIALLY VALIDATED.** Every automated gate passes (typecheck, 343 tests,
lint, build) and the architectural audit found no violation. The manual browser
UX and accessibility walkthrough of `/metas` could not be executed because of
the onboarding gate on the preview account (section 8) and remains open.
