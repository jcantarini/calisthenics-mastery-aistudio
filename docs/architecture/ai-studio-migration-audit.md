# AI Studio migration audit — 20 September 2026

## Finding

The imported repository main commit `db2de9fba869d2cfa6481b33f9f6b4aa6e8401ec`
was an older copy, not a completed platform conversion. It lacked six migrations,
the three Progress History regression suites, their CI workflow and validation
records. Implementation-state documentation and generated database types lagged
behind the independently validated sprint branch.

## Recovery and portable execution

Restored the storage work through 8.1A3-C1 from original repository commit
`c143d5451f51f2d08ea4749a6dc87a9e40c35fa3`. All 21 migrations and existing SQL
cases remain byte-identical. Original evidence:
https://github.com/jcantarini/calisthenics-mastery/actions/runs/34811137868
(169 core, 127 auxiliary, 107 outbox cases, twelve negative scenarios and the
default-grant regression).

Replaced Lovable Vite configuration with explicit TanStack Start, React,
Tailwind, path resolution and Nitro Node plugins. Preserved the SSR error wrapper.
Added a standalone Vitest configuration and a Node production start command.
Google/Apple OAuth now calls Supabase directly and retains a validated local
return destination. Removed the Lovable authentication bridge and error reporter.
The public client rejects privileged keys and handles missing browser environment
configuration without an unguarded process reference. The admin module has an
explicit TanStack server-only boundary.

Removed the two Lovable packages and their unused dependency closure using Bun
1.3.3. Retained package-resolution records were not upgraded. No new runtime
package was introduced. The old 2.12.0 requirement applies to the historical
Lovable baseline only and is intentionally superseded here.

Removed the tracked environment file and provided a placeholder example. The
inspected file contained public project configuration and an anon key, not a
service-role key. Local environment files are now ignored; Git history was not
rewritten. No hosted database, provider credentials or users were migrated.

## Portable baseline

The CI runner now enforces these explicit hashes and the absence of Lovable
packages instead of requiring the removed Lovable configuration package.
Migration hashes and regression gates were not relaxed.

| File                                  | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `package.json`                        | `cfc902148a19b3a4e97b754619541b76a224ae45fe3f2e69955392914d04f582` |
| `bun.lock`                            | `67301a19d3568a7ce27bcd8f67a34a6dc3f5f6e52e7b90c1aa1eac6a36781a46` |
| `src/integrations/supabase/client.ts` | `69337fec7bd5c6e9d788b2a74978b2f13a029e05586322d5e1b36a71a140a5cc` |
| `src/integrations/supabase/types.ts`  | `a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18` |

## Verification

- Frozen install succeeded before the targeted dependency removal.
- All retained lockfile package records match the previous baseline.
- Application tests: 370 passing (24 test files), including migration regressions.
- TypeScript: no errors.
- ESLint: no errors; 13 existing Fast Refresh warnings.
- Production Node build succeeded.
- Production `/auth` returned HTML; PWA manifest returned successfully.
- PostgreSQL suites are restored; fresh remote execution is recorded by the
  pull request checks. Historical results above are not represented as a new run.

## Remaining acceptance gates

Live AI Studio preview was not accessible through this repository review.
Configure the actual preview/deployment environment and Supabase providers,
allow the application `/auth` callback, and test Google/Apple sign-in, refresh,
logout and protected navigation in a standalone browser window. No credentials
should be pasted into source files. Do not share privileged keys in chat.

No hosted migrations were applied. Confirm the connected project's migration
history before separately authorizing any database deployment. This repository
remains a web application, not Kotlin or an Android APK.

8.1B1 and all subsequent Progress History runtime work remain unimplemented.
See [the complete roadmap](../ROADMAP.md).
