# Core Architecture — v1.0 (Frozen)

This folder is the permanent architecture documentation of the calisthenics
app. It describes the **actual** implementation as of Sprint 6.6B, not an
aspirational design.

## Index

| Document                                                             | Content                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [domains.md](./domains.md)                                           | Domain boundaries and responsibilities                                       |
| [services.md](./services.md)                                         | Public service APIs and conventions                                          |
| [data-flow.md](./data-flow.md)                                       | Dependency direction and runtime flows                                       |
| [database.md](./database.md)                                         | Schema, RLS, indexes, integrity                                              |
| [training.md](./training.md)                                         | Workout generation, plan generation, plan runtime                            |
| [gamification.md](./gamification.md)                                 | XP, Progression, Achievements, Orchestrator                                  |
| [goals.md](./goals.md)                                               | Goals domain: implementation of Sprints 7.1–7.5                              |
| [goals-release-gate.md](./goals-release-gate.md)                     | Goals Phase 7 release gate and validation record                             |
| [progress-current-state-audit.md](./progress-current-state-audit.md) | Sprint 8.0A read-only audit of Progress, History and their real data sources |
| [progress-history-decision-proposal.md](./progress-history-decision-proposal.md) | Sprint 8.0B-A decision proposal for the future Progress & History domain (not yet approved) |

| [conventions.md](./conventions.md)                                   | Coding conventions and architecture guardrails                               |
| [architecture-freeze-v1.md](./architecture-freeze-v1.md)             | Sprint 6.6B freeze report                                                    |
| [decisions/](./decisions/)                                           | Architecture Decision Records (ADRs)                                         |

## Architecture overview

```
React Components (src/routes, src/components)
        ↓
Hooks (src/hooks)
        ↓
Services / Orchestrators (src/services)
        ↓
Domain Rules (pure modules: *Rules.ts, levelCurve.ts, workoutRules.ts, ...)
        ↓
Persistence (Supabase client, src/integrations/supabase)
```

This is a **dependency guideline, not a law**. Dependencies always point
downward — a service never imports a hook, a domain rule never imports the
Supabase client. But a simple infrastructure call (for example
`supabase.auth.signOut()` in a settings screen) does **not** need an
artificial service wrapper. See [conventions.md](./conventions.md) for the
classification we apply.

## Technology

- TanStack Start v1 (React 19, file-based routing, SSR-capable)
- TanStack Query for server-state caching (training runtime)
- Supabase (Postgres + Auth + RLS) via the generated client
- Tailwind CSS v4, shadcn/ui, `motion` for animation
- Vitest for domain unit tests
