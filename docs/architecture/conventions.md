# Conventions & Architecture Guardrails

## Guardrails (binding for all future work)

**RULE 1** — React components do not own domain business logic. No formulas,
thresholds, reward tables or state machines in `src/routes` or
`src/components`.

**RULE 2** — `TrainingPlanService` remains the single source of truth for
training-plan generation and runtime. Nothing else writes `training_plans`,
`training_weeks`, `training_days` or `planned_workouts`.

**RULE 3** — `XPService` owns XP. Amounts, idempotency and history live there
and nowhere else.

**RULE 4** — `ProgressionService` owns level calculations and the level curve.

**RULE 5** — `AchievementService` owns achievement evaluation and unlocking.

**RULE 6** — `GamificationOrchestrator` coordinates engines but never
duplicates their logic. If you are writing a number into the Orchestrator,
you are in the wrong file.

**RULE 7** — Future domains integrate through published service APIs and event
buses, never by writing directly into another domain's tables.

**RULE 8** — Do not introduce a new architectural abstraction until a real use
case requires it. YAGNI.

## Direct Supabase access — classification

Reviewed in Sprint 6.6B. Not every query needs a service.

- **Category A — infrastructure, no business logic.** May remain in the
  component. Examples: `supabase.auth.getUser()`, `supabase.auth.signOut()`,
  `supabase.auth.onAuthStateChange()`. Wrapping these adds indirection with no
  architectural benefit.
- **Category B — domain operation with rules, orchestration or reuse.** Must
  live behind a service. Examples: onboarding persistence (`src/lib/onboarding.ts`),
  assessment scoring and recommendation (`src/lib/assessment.ts`), reminder
  scheduling (`src/lib/workout-reminders.ts`).
- **Category C — training/gamification write that bypasses an established
  single source of truth.** Always a violation; refactor to the owning service.
  **Current status: zero Category C violations.**

## Code conventions

- Pure domain rules live in `*Rules.ts` / `*Curve.ts` modules with no IO, so
  they are unit-testable without mocks.
- Services are objects with async methods; they resolve the current user when
  `userId` is omitted.
- Prefer `unknown` + validation over `any` for external data. `any` is
  disallowed by lint (`@typescript-eslint/no-explicit-any`).
- Empty `catch` blocks must carry an explanatory comment — silent failure is
  only acceptable when it is deliberate and documented inline.
- Server-only code lives in `*.server.ts` (bundler-enforced) or inside a
  `createServerFn` handler. Never import `client.server.ts` from client code.
- Formatting is enforced by Prettier through ESLint (`bun run lint`).
- Bun is the only canonical package manager: `bun.lock` is the sole authoritative
  lockfile, installs use `bun install --frozen-lockfile`, and dependency changes are
  made with Bun. npm, Yarn and pnpm must not install or update dependencies here.


## Commands

```bash
bun run dev         # dev server
bun run build       # production build
bun run lint        # eslint + prettier
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run test:watch  # vitest watch
```
