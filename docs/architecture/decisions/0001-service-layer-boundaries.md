# 0001 — Service Layer Boundaries

**Status:** Accepted (Sprint 6.6B) · Part of Core Architecture v1.0

## Context

The app grew from a local-state prototype into a Supabase-backed platform.
Early code called Supabase directly from routes. As domains (training, XP,
progression, achievements) appeared, that pattern risked business rules being
duplicated across screens.

A blanket rule of "no Supabase in components" would, however, force artificial
wrappers around one-line auth calls with no domain meaning.

## Decision

Dependencies flow one way: **Components → Hooks → Services → Domain Rules →
Persistence**. Direct Supabase access from a component is classified:

- **A** — infrastructure only (`supabase.auth.*`): allowed to stay.
- **B** — carries domain rules or is reused: must live behind a service.
- **C** — writes to training/gamification tables owned by another service:
  always a violation, must be refactored.

## Reason

Boundaries exist to prevent rule duplication and to keep domain logic
testable — not to maximise the number of layers. The classification gives an
objective test instead of a stylistic preference.

## Consequences

- Domain rules are unit-testable without React or a database.
- `supabase.auth.getUser()` in a route is acceptable and documented, not a bug.
- Reviewers have a shared vocabulary (A/B/C) for boundary discussions.
- Cost: contributors must know the classification; it is documented in
  `conventions.md`.
