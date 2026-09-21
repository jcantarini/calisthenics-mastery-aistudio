# A1 — Android build and trust boundary containment

Status: implemented on android/a1-containment; independent CI validation pending.
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

Local Gradle bootstrap could not download its distribution because the Java
process reported network unreachable. This is not a successful local build.
The first GitHub run assembled the debug APK and passed seven pure tests, but
Robolectric SDK 36 could not initialize under JDK 17. CI and checkout instructions
now use JDK 21, as required by Robolectric; no tests were disabled. Final CI results
will be recorded after the rerun. Device, background/process
lifecycle, provider authentication and AI Studio synchronization are not yet validated.

## References

- [Robolectric Java/SDK compatibility](https://robolectric.org/compatibility_table/)
- [Gradle checksums](https://gradle.org/release-checksums/)
- [AGP 9.1 compatibility](https://developer.android.com/build/releases/agp-9-1-0-release-notes)
- [Android source and commands](../../android/README.md)
- [Original audit](android-native-audit.md)
