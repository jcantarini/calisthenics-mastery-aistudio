# Barra — Calisthenics Training App

A mobile-first calisthenics application: personalised training programs from
beginner to advanced, exercise videos, interval timer, nutrition planning and
a full gamification layer (XP, levels, achievements).

## Purpose

Guide a user from an initial fitness assessment to a personalised 4-week
training plan, track execution day by day, and keep motivation high through a
game-like progression system. Available in Portuguese, English, Italian,
Spanish and French.

## Technology stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Framework  | TanStack Start v1 (React 19, file-based routing)        |
| Build      | Vite 8                                                  |
| Styling    | Tailwind CSS v4, shadcn/ui, `motion`                    |
| Data       | TanStack Query (training runtime) + domain event buses  |
| Backend    | Supabase — Postgres, Auth (Google/Apple), RLS           |
| Testing    | Vitest                                                  |
| Language   | TypeScript (strict)                                     |

## Local setup

```bash
bun install
bun run dev        # http://localhost:8080
```

## Environment configuration

Client-side configuration is read from `import.meta.env` and must use the
`VITE_` prefix:

| Variable                        | Scope  | Sensitivity              |
| ------------------------------- | ------ | ------------------------ |
| `VITE_SUPABASE_URL`             | client | public                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | publishable / anon — safe |
| `VITE_SUPABASE_PROJECT_ID`      | client | public                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | server | **privileged**           |

Privileged credentials are injected at runtime on the server only and are read
exclusively inside `src/integrations/supabase/client.server.ts`, which the
bundler refuses to include in any client chunk. Never reference a privileged
key from a `VITE_`-prefixed variable and never commit one.

## Development commands

```bash
bun run dev         # dev server
bun run build       # production build
bun run build:dev   # development-mode build
bun run preview     # preview a production build
bun run lint        # eslint (includes prettier)
bun run format      # prettier --write
bun run typecheck   # tsc --noEmit
bun run test        # vitest run (single pass)
bun run test:run    # alias of the above, for CI
bun run test:watch  # vitest in watch mode
```

## Project structure

```
src/
  routes/              file-based routes (_authenticated/* is session-gated)
  components/
    dashboard/         dashboard widgets
    gamification/      XP, level and achievement UI
    ui/                shadcn primitives
  hooks/               React ↔ service bindings
  services/
    workout-generator/ single-workout generation
    training-plan/     plan generation + runtime (source of truth)
    xp/                XP engine
    progression/       level engine
    achievements/      achievement engine
    gamification/      orchestrator
  lib/                 cross-cutting helpers (i18n, theme, nutrition, PWA...)
  integrations/supabase/  generated clients and middleware (do not edit)
docs/architecture/     architecture documentation
```

## Architecture documentation

The Core Platform architecture is documented in
[`docs/architecture/`](./docs/architecture/README.md) and is **frozen at
v1.0** — see
[`architecture-freeze-v1.md`](./docs/architecture/architecture-freeze-v1.md).
New features must extend the architecture; redesigning it requires a
documented architectural reason and a new ADR.
