# A1 — Android build and trust boundary containment

Status: A1 independently validated; ready for review in PR #3. Not merged or deployed.
Validated code revision: 650d1fc69f93da772d044cb3cc8da7f581adfad3.
Baseline: A0 e03bb644e642948856088d467300e55cd9b3004d.

## Changes

- Restore official Gradle 9.3.1 wrapper scripts/JAR, checksum-pinned distribution,
  and independent Android CI with assembleDebug, unit/Compose tests and lintDebug.
- Use default debug signing when no explicit AI Studio debug keystore is provided.
- Replace corrupted launcher assets with XML references to the valid exported
  JPEG; remove the corrupted screenshot and replace its test with behavior tests.
- Remove fabricated Google accounts, Firebase fallback identities, preference
  session restoration, static ONLINE indicators and direct history/hydration HTTP writes.
- Keep guest exploration temporary and isolated; clear all user state on logout
  or guest switch, including active timers/workouts. Clear obsolete token preferences.
- Remove earned-progress fixtures and all local reward/history creation paths.
  Workout completion and timer skipping never fabricate evidence or minimum duration.
- Add tests for empty state, unavailable auth/sync, repeated claims, guest isolation,
  obsolete preferences, empty/repeated completion and honest UI messages.

## Preserved boundaries

No web source, package/lockfile, migration, backend contract or shared provider
change. Original A0 manifest remains historical evidence. No shared DB deployment,
release signing or APK publication. Real auth belongs to A2; domain parity to A3/A4;
trusted completion/persistence depends on 8.1B–D and A5. Guest drafts are not history.

## Validation

- [Native CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35630492895):
  clean-checkout `./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug --stacktrace` passed.
- The XML test reports contain **13 tests, 0 failures, 0 errors, 0 skipped**.
  Reports artifact: 10653704235; SHA-256:
  `aaeb35cbf1c63ea87e602593cea6bda63e2e4b214f71a37d71e01f5f601387c4`.
- Android lint: **0 errors, 49 warnings** (dependency freshness, target API,
  unused resources, resource placement, redundant label and KTX suggestions).
  No lint suppression or test removal was used to bypass a failed gate.
- [PR native CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35630499515) also passed.
- [Web CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35630499482):
  **370 tests passed**, typecheck, lint (0 errors, 13 existing warnings), production
  build and production-server smoke test passed. Frozen dependency install preserved inputs.
- All 21 migrations and backend sources remain byte-identical to A0/M1. SQL suites
  were not rerun for A1; the unchanged baseline's previous successful evidence is
  [M1 SQL CI](https://github.com/jcantarini/calisthenics-mastery-aistudio/actions/runs/35539272524).
- Both original JPEGs decoded and remain byte-identical. XML resources parsed;
  wrapper JAR checksum matched official Gradle 9.3.1. Documentation formatting passed.
- package.json SHA-256: `cfc902148a19b3a4e97b754619541b76a224ae45fe3f2e69955392914d04f582`.
  bun.lock SHA-256: `67301a19d3568a7ce27bcd8f67a34a6dc3f5f6e52e7b90c1aa1eac6a36781a46`.

The first native CI attempt assembled the APK and passed seven pure tests but
could not initialize Robolectric SDK 36 under JDK 17. Using JDK 21 resolved this
without lowering the tested SDK or disabling tests. Local Java bootstrap lacked
network access; successful build/test evidence above comes from GitHub CI.

Instrumented emulator/device tests, provider authentication, process/background
lifecycle, release signing and AI Studio synchronization were **not run**. These
remain explicit A2/A5/A6 gates. A1 is containment, not native product parity.

## Outcome and next stage

A1 meets its build and containment gate. A2 may implement real authentication,
following [the A2 prompt](../android-a2-prompt.md). No release is approved.
The original invalid icon binaries were replaced by XML references to the valid
exported JPEG; the invalid screenshot and its greeting-only assertion were replaced
by behavior tests. The A0 manifest still describes the untouched historical export.

## References

- [Robolectric Java/SDK compatibility](https://robolectric.org/compatibility_table/)
- [Gradle checksums](https://gradle.org/release-checksums/)
- [AGP 9.1 compatibility](https://developer.android.com/build/releases/agp-9-1-0-release-notes)
- [Android source and commands](../../android/README.md)
- [Original audit](android-native-audit.md)
