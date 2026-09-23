# Sprint A2 — Android Verified Authentication & Session Isolation

Execute only after A1 debug assembly, Android tests and lint have passed.
Use the reviewed android/a1-containment revision, not the untouched AI Studio export.
Android/Kotlin is the primary app; web remains a behavioral reference.

## Objective

Implement genuine Google-to-Supabase authentication and a robust Android session
lifecycle. A display name, email, Google account picker or Firebase UID alone is
never a verified Supabase session. Preserve ADR 0005 and existing backend schemas.

## Before implementation

Read AGENTS.md, android/AGENTS.md, docs/ROADMAP.md, the native audit, A1 validation,
ADR 0005 and its companion contracts. Verify the branch and A1 test evidence.
Inspect current official Google Android identity and Supabase documentation and
record the selected supported flow and dependency compatibility before coding.
Prefer a native Google credential followed by a verified Supabase token exchange;
if a browser OAuth flow is chosen, document PKCE, exact redirects and safe app return.
Do not add Firebase as a second identity authority or invent an auth protocol.

Inspect existing provider configuration using authorized read-only access. Record
missing project access, client IDs, signing fingerprints and redirect registrations.
Do not silently change shared providers, create production credentials or ask the
user to paste secrets into chat. Prepare concrete configuration instructions when
provider changes are required. Missing configuration must fail closed.

## Required implementation

1. Add a narrow auth/session abstraction with signed-out, guest, loading,
   authenticated and recoverable-error states. Only a validated Supabase session
   supplies an authenticated user ID. Keep guest exploration explicitly local.
2. Implement Google success, user cancellation, provider failure, missing config,
   offline failure and token-exchange rejection. No fallback account or local UID.
3. Store tokens through a reviewed Android Keystore-backed approach; never plain
   preferences, logs, source, BuildConfig or cloud/device backup. Handle key loss,
   corrupted storage and reinstall by returning safely to signed out.
4. Restore sessions with expiry/refresh handling through the supported auth client.
   A saved UID/name/email never establishes auth. Prevent concurrent refresh races
   and stale asynchronous responses restoring a logged-out or different account.
5. Logout immediately clears local session and all user-owned UI/cache/workout/timer
   state. Attempt supported remote logout without pretending an offline request
   succeeded. Re-entry and account switching must not retain another user's data.
6. Keep A1's obsolete fake-session cleanup as a one-time legacy cleanup. Do not
   clear the new secure session store on every app startup. Never promote old
   prototype preference values to a valid session.
7. Keep history, outbox and reward writes disabled until trusted backend ingestion
   is implemented. Authentication alone does not unlock canonical persistence.
   No direct INSERT/UPDATE/DELETE to canonical history or browser/APK RPC execution.
8. Public Supabase endpoint/publishable key and Google public client identifiers
   must have explicit configuration and safe missing-value behavior. Never embed
   service-role keys, OAuth client secrets or Gemini server credentials in the APK.
9. Distinguish authenticated from synchronized. No static ONLINE/table counts or
   success message unless the corresponding authenticated operation succeeded.
10. Verify the actual application ID and debug signing fingerprints before provider
    instructions. Keep package identity changes explicit; no blanket dependency upgrades.

## Scope limits

Modify Android code/tests/build configuration and relevant documentation only.
Preserve web code, package.json, bun.lock, existing migrations and ratified contracts.
No shared database deployment, RLS/grant weakening, reward implementation, onboarding
rewrite, food logging, APK publication or release signing. A3/A4/8.1/A5 remain separate.
If provider access blocks live validation, complete reversible local implementation
and tests, document the exact remaining provider step, and keep A2 unapproved.

## Validation

Run clean debug assembly, all Android unit/Compose tests and lint. Add meaningful
coverage for success with verified identity, cancellation, denied/missing credentials,
exchange failure, expired/invalid tokens, refresh races, process recreation, offline
logout and switching users while requests are in flight. Verify secure storage and
backup exclusions, and absence of token logging or privileged APK configuration.

Then validate Google login, app return, restart/refresh and logout on an actual
Android runtime against the configured project with authorized test credentials.
Mocked tests alone do not approve real provider integration. Report physical device,
emulator, provider and AI Studio checks separately; not run is not passed.

Record commit and GitHub CI links. Explicitly synchronize the reviewed revision to
AI Studio and compare the resulting source before claiming that its preview is up
to date. Do not infer synchronization from a GitHub push.

## Delivery

Update docs/ROADMAP.md with implemented, validated and blocked work separately.
Report changed files, auth flow, public configuration required, test counts, CI,
provider/device evidence and remaining limitations. Advance to A3 only when all
A2 acceptance gates pass; otherwise supply a scoped A2 correction/continuation prompt.
