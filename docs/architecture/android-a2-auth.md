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

## AI Studio synchronization inspection — 26 September 2026

GitHub PR #4 remains draft/unmerged at `bf00310db8ed3be1f80c0d8d1f508932e8700e0d`.
The user reported synchronization; independent inspection of the supplied app
`ea998e0a-d223-40de-bb08-b94120125e34` does not establish A2 source parity:

- File search for `SessionController` returned `No matching results`.
- Opening `app/src/main/java/com/example/MainActivity.kt` from the file tree showed
  `import android.app.Activity`, `LocalContext.current` and `context as? Activity`.
  The reviewed A2 source instead imports `LocalActivity` and includes the
  authenticated lifecycle integration missing from the visible imports.
- The export menu labels the GitHub operation `Push to GitHub / Sync to a
repository`. No inbound branch synchronization was demonstrated.

This is a confirmed source mismatch, not proof of the exact old commit or of every
file in the editor. Export download attempts did not return a usable archive, so
no full-export hash comparison or new build/runtime result is claimed. No source
was changed in AI Studio, no prompt submitted to Gemini, and no outbound push,
merge, provider change, database change or APK publication was performed.

A deterministic source ZIP was prepared from the 63 tracked files under `android/`
at `bf00310`, with the `android/` prefix removed. Every packaged byte was checked
against Git. The [manifest](../android-a2-sync-manifest.json) records paths and
SHA-256 values; the [corrective prompt](../android-a2-sync-prompt.md) defines the
import and independent verification. This verifies the handoff package only, not
the AI Studio source or runtime. Application inputs remain unchanged; automated
build/tests were not rerun during this documentation/package step. Live provider
verification, real Google sign-in and device lifecycle scenarios remain pending.

## Independent export verification — 27 September 2026

This supersedes the unresolved source mismatch recorded above; it does not accept
A2 or prove the identity of the running preview.

- Input: `untitled.zip`, 8,077,549 bytes, 480 files; ZIP CRC check passed.
- Input SHA-256: `644562259235309bb0e94456703ebf21e7600fb27e219be3fd70245f00531e75`.
- Root Android source: **63/63 full SHA-256 matches**, zero changed/missing manifest
  files, against `bf00310` (same Android source at documentation commit `033ba5e`).
- Nested `public/evidence/source-a2-sync.zip`: 1,390,535 bytes, 63 files, all match.
  SHA-256: `51900a15a1be90db5ef2a2d889076f6f7386462732c75ea63ccdbc4c1d4d454f`.
- Ten additional launcher WebP resources are present under density-specific mipmap
  directories. They are outside the 63-file baseline and explicitly accounted for;
  the full build tree is therefore not claimed byte-identical to GitHub.
- Internal `calisthenics-mastery-aistudio-main/`: 394 files, exactly the previously
  received A1 snapshot. Root settings include only `:app`; the internal copy is not
  a declared Gradle module. No removal is required to close source parity.

Seven XML suites contain 36 testcase elements, consistent with their suite totals:
ExampleRobolectric 1, LocalGuestState 9, PrototypeIsolation 3, SessionController 15,
SessionVault 4, SupabaseAuthGateway 2 and TrustBoundaryUi 2. All record zero failures,
errors and skips; timestamps are 26 September, 21:22–21:23 UTC. These are delivered
unit/Compose test results, not a new run and not real-provider or device validation.

The delivered lint HTML reports **59 warnings, no errors**, generated by AGP 9.1.1
at 21:23:55 UTC. Categories: ApplySharedPref 1, CredentialManagerMisuse 1,
RedundantLabel 1, AndroidGradlePluginVersion 2, GradleDependency 22,
NewerVersionAvailable 16, UnusedResources 7, IconDipSize 2, IconLocation 2,
UseKtx 1 and UseTomlInstead 4. The credential warning requests explicit
NoCredentialException handling. Provider exceptions currently reach the controller's
failure path without authenticating; the real no-credential UX remains a live test.
No warning suppression or dependency upgrade was performed.

`build-info.md` is an environment summary, not the requested raw build log. No APK
is included, so its stated APK hash, DEX contents, signing fingerprint and installed
preview identity were not independently verified. No keystore, .env or local.properties
path was found in the export; no private signing file was copied into this repository.

This verification ran ZIP integrity, full-byte source comparisons and report parsing
only. Build, unit tests, instrumentation, live login and SQL were not rerun. Existing
CI evidence remains applicable to unchanged tracked code. No provider, database,
application source or deployment changed. Next: actual configured/signed build,
provider verification, login/refresh/logout/account switching and error scenarios.

**A2 SOURCE PARITY VERIFIED — LIVE AUTHENTICATION HOMOLOGATION PENDING**

## References

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/reference/kotlin/installing
- https://github.com/supabase-community/supabase-kt/tree/3.2.2
- https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
- https://developer.android.com/privacy-and-security/keystore

## Current follow-up — 28 September 2026

The [device acceptance and source synchronization record](./android-a2-device-homologation.md)
supersedes the older live-login and export blockers above. It records the reviewed
AI Studio fixes, delivered 73-test evidence, owner device results and reported
backend refresh/verification at 16:49:21 UTC. The source synchronization and its fresh CI are complete (73 unit/Compose tests,
two device tests, assembly/lint and 370 web tests passed). Scheduled-renewal
evidence remains pending; A3 remains blocked.
