# Sprint A1 — Android Build Baseline & Trust Boundary Containment

Android/Kotlin is now the primary application. Use the Android source preserved in
`android/` and the findings in `docs/architecture/android-native-audit.md`.
The web source is a behavioral reference, not evidence that Android is validated.

## Objective

Make the exported Android project reproducible and remove the misleading or unsafe
prototype behavior before implementing real authentication in A2. Preserve the UI,
catalog, native direction and the backend's ratified domain contracts.

## Scope

1. Restore a complete, official Gradle wrapper matching the pinned distribution,
   verify its provenance/checksum, and provide deterministic checkout instructions.
   Inspect current official Android/Gradle compatibility documentation before
   changing versions. Do not perform blanket dependency updates.
2. Remove the dependency on an untracked root `debug.keystore` for local/CI debug
   builds. Preserve AI Studio compatibility explicitly if that environment needs
   an override. Never commit production signing material.
   Recover the ten invalid WebP icons and the invalid PNG screenshot from a
   trustworthy original source; validate binary signatures and decode all assets.
   The two exported JPEGs passed independent decoding and must be preserved.
3. Add Android CI for debug assembly, unit tests and lint with explicit JDK/SDK
   versions. Existing web/SQL gates must remain intact. Add tests that cover the
   risks below, not only assertions that repeat implementation details.
4. Remove `GoogleAccountBottomSheet`, the hardcoded detected account, manual
   name/email-to-Google-identity conversion and successful-login fallbacks.
   With real authentication still pending A2, show an honest unavailable state;
   cancellation, provider errors and missing client configuration never log in.
   A local guest may remain only if clearly labeled, isolated, without cloud
   identity or reward-bearing persistence. Do not call it a Google account.
5. Do not restore authenticated UI solely from saved UID/name/email. Clear legacy
   prototype identities and isolate state on logout/account change. Do not invent
   a replacement authentication protocol in this sprint.
6. Remove sample workout history, XP, streaks, hydration and pre-earned
   achievements from production defaults. Do not import these fixtures into
   canonical history. Keep empty-state UI meaningful and avoid division by zero.
7. Stop direct REST writes from the APK to canonical workout and auxiliary history
   tables. Until trusted ingestion is implemented, explicitly mark completion
   persistence/rewards unavailable; do not present a local increment as saved.
8. Remove optimistic/hardcoded `ONLINE`, table counts and successful sync claims.
   HTTP/network failures must remain failures. Do not report sync success when
   responses are ignored or cannot be applied to the authenticated user's state.
9. Prevent unverified/local workout, timer or manual goal actions from awarding
   canonical XP. Preserve the original domain ownership and future idempotency
   contract. Full rule parity belongs to A4, not arbitrary new reward constants.
10. Review backup rules for identity/session preferences and exclude credentials
    from cloud backup/device transfer. Do not put server secrets or Gemini server
    keys into APK BuildConfig. Public Supabase configuration must be explicit.

## Boundaries

- Do not deploy migrations, modify shared database grants/RLS, publish an APK, or
  weaken constraints to make prototype requests succeed.
- Preserve all existing migrations byte-for-byte and ADR 0005 invariants.
- Do not start nutrition food logging, CalorieCam, schema redesign or new rewards.
- Do not claim Google/Supabase authentication is implemented merely by removing
  the fake path. That is A2 and requires live provider/session validation.
- Export/import between GitHub and AI Studio must be explicit; do not assume sync.

## Acceptance

- Clean-checkout debug build and Android tests/lint pass with recorded commands.
- Credential cancellation/error/missing configuration leaves the user signed out.
- No arbitrary name/email creates an authenticated identity.
- No sample progress is displayed as user-earned progress.
- Account switching cannot retain another account's metrics.
- No direct history POST remains reachable from production UI.
- Failed sync cannot show success and unavailable persistence is visible.
- Existing web and SQL gates remain green; no migration changed.
- Update roadmap with implemented, tested, not run and remaining blockers separately.

Return the commit/PR, modified files, test evidence and remaining A2 requirements.
Do not mark A1 complete or proceed automatically if its acceptance gate fails.
