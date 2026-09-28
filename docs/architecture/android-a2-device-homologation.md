# A2 — device acceptance and AI Studio source synchronization

Updated: 28 September 2026.

**Status:** `A2 IMPLEMENTED — VALIDATION/HOMOLOGATION BLOCKED`

## Scope and provenance

The independently inspected AI Studio export `untitled (13).zip` is the source
for this follow-up. Its 83-file inner package includes 78 Android project files
and five evidence/documentation files. All 83 match the exported workspace.
Of these, 68 project files map from the AI Studio root to repository `android/`;
the [manifest](../android-a2-c3-sync-manifest.json) records every mapping and hash, plus ten excluded corrupt WEBP resources.
Documentation is consolidated here and in [the roadmap](../ROADMAP.md), rather
than importing the stale nested A1 repository or its broken relative links.

The updates add legacy public anon-key compatibility with validation, sanitized
debug authentication diagnostics, identity-scoped profile forms and strict
weight/height/birth-year validation. Profiles remain volatile; persistence is A3.
The repository receives the exact reviewed bytes of those 68 files. Ten added
WEBP launcher files are corrupt in both the ZIP and delivered APK (their UTF-8
transcoding breaks the binary RIFF data). They are omitted; the existing anydpi
vector and adaptive launcher resources cover the supported Android versions.
This is an explicit resource-only difference from the AI Studio export. No live credential, signing key, APK, generated report,
duplicate repository, backend change or migration is added.

Connected APK inspected and tested by the owner:

- Application ID: `com.aistudio.calisthenicsmastery.app`.
- SHA-256: `5133d95e30ae6645da21fa61665ab9e506aa457d944724cacbb2ec9c8aee58f8`.
- Size: 23,735,631 bytes.
- Signing certificate SHA-1: `BF:07:E1:2A:D1:DA:01:22:E3:00:C9:2C:5E:89:DE:2E:3E:80:EF:40`.
- DEX BuildConfig contains the expected public backend URL, Google Web client ID
  and public anon key. The full key is deliberately not recorded here.

CI uses its own debug signing environment and public configuration defaults.
Its APK is not asserted to be byte-identical to the configured device APK.
No release signing or release publication is performed.

## Automated evidence and limits

Delivered AI Studio XMLs dated 28 September 2026, 13:30–13:31 UTC, contain
73 tests in 11 suites, with zero failures, errors or skips. The accompanying
lint report contains 58 warnings. These artifacts were inspected; Gradle was
not rerun locally during the synchronization review.

| Suite                         | Tests |
| ----------------------------- | ----: |
| AuthConfigurationTest         |     9 |
| AuthDiagnosticsTest           |    10 |
| BuildValidationFunctionalTest |     9 |
| ExampleRobolectricTest        |     1 |
| LocalGuestStateTest           |     9 |
| ProfileIdentityIsolationTest  |     9 |
| PrototypeIsolationTest        |     3 |
| SessionControllerTest         |    15 |
| SessionVaultTest              |     4 |
| SupabaseAuthGatewayTest       |     2 |
| TrustBoundaryUiTest           |     2 |

The controller tests cover concurrent renewal, rejected/expired sessions,
identity changes, late responses and offline logout. Vault tests cover AES-GCM
round-trip, tampering, key loss and project isolation using injected JVM keys.
They do not prove remote traffic or hardware-backed key storage.

Historical [CI run 35752315322](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35752315322)
and its `keystore-device` job 106829316387 were rechecked through GitHub and
report success. The historical record reports two instrumented tests on an API 35
emulator. The vault, its device test and dependency lock are byte-identical to
that A2 baseline. Build configuration and other app sources have since changed;
the unchanged component evidence is useful but is not a fresh whole-build result.
Current source commit `d8bf9985ac4572f41017a141682054c7d0837958` and CI merge
`43d4ef311fca277bf553b91e2aac6ace40ce30e2` have identical Git tree
`d98060e3de23a9bd4a79df632b69ac2535b3c490` (fetched and compared locally).
[Android CI 36494523445](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/36494523445)
passed assembly, unit/Compose tests and lint. Downloaded artifact `11002799686`
(SHA-256 `276d5172862c5a58ccaf0dad4716a0c21e504524b941953bca58c0714a9a0bed`)
contains 73 tests in 11 suites, zero failures/errors/skips, and lint XML with
57 warnings and zero errors. This is fresh CI evidence, distinct from the
AI Studio reports above. The `keystore-device` job also passed: two instrumented tests completed on the
API 35 emulator. Device artifact `11003215990` has SHA-256
`1392fb2cf15c11007ed57a931c3f7d25d18fa472d22a2bc2825803340a6c1854`.
[Web CI 36494523390](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/36494523390)
passed 370 tests, typecheck, lint (13 warnings, zero errors), build and production
smoke. Protected dependency files and all migrations remain unchanged.
SQL tests were not rerun because no SQL changed.

AndroidKeyStore is used by the native implementation. TEE/StrongBox protection
has not been measured and is not assumed or made a new acceptance requirement.

## Owner-confirmed device scenarios

These results were reported by the owner in the conversation on 28 September;
they were not performed remotely by the reviewer.

| Scenario                    | Evidence and result                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google login                | Owner entered the account successfully after provider configuration was corrected.                                                                                         |
| Restart                     | Owner remained authenticated after closing and reopening.                                                                                                                  |
| Cancellation                | Cancelling account selection did not authenticate; the next login succeeded.                                                                                               |
| Offline logout              | Owner signed out without network and remained signed out after reopening and reconnecting.                                                                                 |
| Account and guest isolation | Personal profile values did not cross either direction; values were discarded when switching.                                                                              |
| Account A/B isolation       | Neither account received the other's profile values.                                                                                                                       |
| Brief background return     | App returned normally without errors or an unexpected login prompt.                                                                                                        |
| Forced process stop         | At approximately 18:49 Rome, owner forced stop through Android settings without logout/data clearing; reopening returned directly to the account without Google selection. |

Profile values are intentionally temporary and can disappear after logout,
identity switch or process death. Session restoration is not profile persistence.

## Backend evidence supplied by Lovable

The owner supplied a read-only Lovable diagnostic, not independently fetched raw
logs. For the forced-stop attempt, it reports:

| Event                                | UTC, 28 September 2026 | Result                |
| ------------------------------------ | ---------------------- | --------------------- |
| POST token, grant_type=refresh_token | 16:49:21.164           | HTTP 200              |
| GET user                             | 16:49:21.380           | HTTP 200              |
| Session refreshed_at                 | 16:49:21.252           | Updated               |
| Prior refresh token                  | 16:49:21.247           | Revoked               |
| Replacement refresh token            | 16:49:21.248           | Created with a parent |

The close time correlation with the owner action supports attribution to the
Android test; `ktor-client` alone is not a unique app/device identifier. An earlier
refresh at 16:48:26.004 UTC also returned HTTP 200. Events 55 seconds apart do not
establish a concurrent duplication defect or prove concurrent deduplication.
This closes the observed restoration-with-remote-refresh scenario, not scheduled
renewal. The backend token lifetime was not accessible and is not assumed.

## Three session paths and remaining gate

1. `restore()` loads a saved refresh token and calls the gateway regardless of
   the prior access-token expiry; the gateway refreshes and verifies the user.
   The forced-stop scenario above exercised this path.
2. `schedule(ticket, next)` schedules renewal near expiry while the process runs.
   The Android system can suspend/terminate the process; this is not guaranteed
   background execution. Natural-time scheduled renewal remains unobserved.
3. `onForeground()` calls `refreshIfNeeded()`; the controller rechecks expiry
   within the network mutex. A brief return alone does not prove a refresh happened.

To finish acceptance, correlate a natural-time scheduled renewal with sanitized
evidence from the same session, distinguishing it from process restoration and
foreground-triggered renewal. Do not alter the system clock, shorten the shared
provider lifetime, expose tokens or infer a universal lifetime of 3600 seconds.
If logs are unavailable, record that limitation rather than inventing a pass.

The source synchronization and current CI are complete as recorded above. Keep PR #4 draft, retain historical manifests, and preserve web files and
all migrations. A GitHub update does not imply AI Studio imported newer documents.
No merge, A3 implementation, backend deployment or release is authorized here.
