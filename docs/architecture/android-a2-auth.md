# A2 — Verified Android authentication and session isolation

Status: implemented; automated checks PASSED at `a5b83ff`; live provider/AI Studio homologation BLOCKED. A2 is NOT approved.
Base: A1 252d063a7c0c6c8fa8d0fba39be200d5c3fd3b62 (code validated at 650d1fc).

## Selected flow

Native Credential Manager explicit Google sign-in button, SHA-256 nonce sent to
Google and original nonce exchanged using Supabase Auth IDToken. Supabase's /user
validates the issued bearer before the app displays an authenticated identity.
Only the verified Supabase user ID identifies an account. No Firebase identity,
editable-email fallback, custom token protocol or browser/deeplink callback is used.

Dependencies are pinned: supabase-kt auth 3.2.2, Ktor OkHttp 3.2.2, existing
Credential Manager 1.5.0 and googleid 1.1.1. The SDK tag uses Kotlin 2.2.0 and
coroutines 1.10.2, compatible with this project's Kotlin 2.2.10/coroutines 1.10.2.
Core-library desugaring 2.1.5 preserves minSdk 24. Application/test dependency graphs are recorded in `android/app/gradle.lockfile`;
normal CI must not regenerate the lock. No web dependencies changed.
The Supabase changelog was reviewed; the recent Auth breaking change concerns
self-hosted API_EXTERNAL_URL/SAML, not this hosted native ID-token flow.

## Session guarantees

The SDK performs exchange, refresh and remote local-scope logout. Each request has
an isolated in-memory SDK client with automatic persistence, automatic refresh and
logging disabled. A coordinator serializes renewals and fences asynchronous results
with an account generation. Expired/rejected/offline restore returns signed out
with a recoverable message; a saved UID never restores authentication.

Only the refresh token is stored, using AES-256-GCM with a non-exportable Android
Keystore key, random IV, authenticated app/project context and atomic file replacement
inside noBackupFilesDir. Access and Google/provider tokens stay in memory. Backup
remains disabled and old plaintext identity preferences are cleaned once. Corruption,
key loss or a different project fails closed. Logout clears local identity and all
user-owned draft/workout/timer state immediately; remote failure is reported honestly.

Authentication does not enable workout persistence, XP, goals dispatch, history
RPCs or outbox access. Existing immutable SQL migrations and ADR contracts are preserved.

## Provider configuration and remaining gate

Read-only access to Supabase project togglhjhpkccrvxejhup was denied by the connector.
Google provider client IDs, nonce settings, consent/test users and project access
could not be independently verified. No shared provider or database change was made.
No live user credentials were used. Read access was retried on 22 September 2026
and remained denied; reconnecting GitHub did not grant Supabase project access.

Supply only these PUBLIC build properties, through local Gradle properties or env:

- `ANDROID_SUPABASE_URL`: the verified HTTPS project URL.
- `ANDROID_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_...`; legacy JWT and secret keys are rejected.
- `ANDROID_GOOGLE_WEB_CLIENT_ID`: the OAuth **Web** client ID accepted by Supabase.

The actual Android application ID remains com.aistudio.calisthenicsmastery.app.
Register an Android OAuth client for this package and the SHA-1 of the actual
AI Studio/local debug signing certificate in the same Google Cloud project as the
Web client. Obtain the certificate using `cd android && ./gradlew :app:signingReport`.
Do not copy the ephemeral GitHub runner's certificate as the developer certificate.
Register release certificates separately only when release signing is authorized.
Enable Google in the existing Supabase project with the matching Web client ID and
provider secret stored only in the provider dashboard; retain nonce verification.
No Android redirect URI is required by this selected native ID-token flow. Do not
modify existing web callback URLs or provider settings without reviewing the impact.

Missing or invalid public configuration leaves Google login unavailable and guest
mode local. Never paste server/provider secrets into chat or into Android build values.

## Validation gate

The initial revision `50cb3bc59f9bcd12a5d27cf7c1dd9671e760f67c` passed the
[Android Keystore emulator job](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35633244529/job/106444310955)
and [web regression CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35633244552).
The combined Android assembly/unit/lint job failed with the lint diagnostic
`LocalContext should not be cast to Activity, use LocalActivity instead`. The
follow-up uses `LocalActivity.current`; its exact code tree subsequently passed
the automated checks below. Do not infer unit-test counts from the earlier failure.

Follow-up changes also revoke discarded late server sessions where possible, bound
provider cleanup time and attempt token-file deletion even if key removal fails.
No remote revocation is guaranteed when offline.

Tests cover unavailable config, cancellation, provider/SDK rejection,
nonce handling, secure storage/tampering, recreation, refresh serialization, timeout,
offline logout and stale account responses. Live Google sign-in, actual signed APK
provider setup, real restart/refresh/logout and AI Studio import/export parity remain
required before A2 approval. Simulated HTTP tests are not provider homologation.

## Local validation attempt and publication

The generated application/test dependency lock completed successfully. The local
assembly/test/lint attempt stopped during dependency resolution with HTTP 403 while
downloading Android lint/compiler artifacts; no compilation, unit-test or lint result
was produced by that attempt. The temporary local SDK was then lost on environment
restart. This is not a passing validation and did not justify bypassing any check.

GitHub connector access recovered on the next continuation. The seven-file code/test/
lock follow-up was published as `a5b83ffeff0a55d8854dded398569211582689a7`, tree
`0396c800f426c0e46e8909ee25e8513bd57fe27d`, with the same tree verified locally.
[Android CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315322)
and [web CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315172)
both completed successfully for this follow-up. No merge, APK release,
AI Studio synchronization or provider change was performed.

## Final automated evidence — 22 September 2026

The CI synthetic merge `cbf881f2aa060690b5d6a525ba2b25721650365f` and published
code commit `a5b83ffeff0a55d8854dded398569211582689a7` were fetched and verified to
have the identical tree `0396c800f426c0e46e8909ee25e8513bd57fe27d`.

| Check                                                  | Result                                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Debug assembly                                         | Passed in Android job 106829316950                                                        |
| Unit/Compose tests                                     | Gradle testDebugUnitTest passed in that job                                               |
| Android lint                                           | lintDebug passed in that job                                                              |
| Real Android Keystore instrumentation                  | 2 tests started on API 35 emulator; connectedDebugAndroidTest and job 106829316387 passed |
| Web regression                                         | 370 tests passed; typecheck, lint, build and production smoke passed                      |
| Web lint                                               | 0 errors, 13 warnings                                                                     |
| Documentation                                          | Prettier and relative-link checks passed                                                  |
| Protected baseline                                     | Web source, package.json, bun.lock, all 21 migrations and A0 manifest unchanged           |
| SQL                                                    | Not rerun; no SQL changed or applied to a shared database                                 |
| Live Google/provider setup and AI Studio source parity | Not validated; remain acceptance blockers                                                 |

The native report artifact is
[10706262118](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315322/artifacts/10706262118),
SHA-256 `0f2c66d0389f570649d2c6e817c9a4f81e5b927ca5fef70787df3d7e852f712c`.
The connector returned a download reference but fetching the ZIP locally returned
HTTP 403. Exact unit-test/skipped counts and native lint-warning counts were not
extracted; they are deliberately not invented. Success here is supported by the
completed CI jobs and their logs, not a fabricated local report.

Web baseline checksums remain:

- package.json: `cfc902148a19b3a4e97b754619541b76a224ae45fe3f2e69955392914d04f582`
- bun.lock: `67301a19d3568a7ce27bcd8f67a34a6dc3f5f6e52e7b90c1aa1eac6a36781a46`

**A2 IMPLEMENTED — AUTOMATED CHECKS PASSED — LIVE HOMOLOGATION BLOCKED**

## References

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/reference/kotlin/installing
- https://github.com/supabase-community/supabase-kt/tree/3.2.2
- https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
- https://developer.android.com/privacy-and-security/keystore
