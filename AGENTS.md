# Calisthenics Mastery — AI Studio repository

The project uses TanStack Start, React, Vite, Nitro (Node), and Supabase.
Read docs/ROADMAP.md and docs/architecture/README.md before implementing work.
The ratified ADR 0005 and its companion contracts remain authoritative.

- Use Bun 1.3.3 and bun.lock. Install with --frozen-lockfile.
- Do not reintroduce Lovable runtime packages or rewrite published Git history.
- Keep existing migrations immutable; validate changes in disposable databases.
- Never deploy migrations to a shared database without explicit authorization.
- Never expose server credentials in VITE\_\* variables or browser code.
- Keep CI baseline changes explicit and documented; never bypass a failed gate.
- Distinguish implemented, validated, deployed and planned work in the roadmap.
