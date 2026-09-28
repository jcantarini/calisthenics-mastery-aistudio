# Android — A2 verified authentication

Android/Kotlin is the primary client. A2 implements Google/Supabase authentication
and encrypted session storage, but real-provider and AI Studio homologation are
still pending. Canonical history, synchronization and rewards remain unavailable.
A compiled debug APK is not a release approval.

## Reproduce validation

Use JDK 21 (required by Robolectric with SDK 36), Android SDK platform 36.1,
build-tools 36.0.0 and platform-tools. Set ANDROID_HOME or supply an untracked
local.properties. From this directory run:

```sh
./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

With an emulator/device connected, run:

```sh
./gradlew --no-daemon :app:connectedDebugAndroidTest
```

On Windows use gradlew.bat. Gradle 9.3.1 and AGP 9.1.1 remain pinned. The official
wrapper JAR and distribution checksums are verified by Android CI. Debug signing
uses the Android-generated local keystore; AI Studio may explicitly supply
AI_STUDIO_DEBUG_KEYSTORE. Release signing and distribution are outside A2.

## Public authentication configuration

Provide these public values using Gradle properties or environment variables:

- `ANDROID_SUPABASE_URL`
- `ANDROID_SUPABASE_PUBLISHABLE_KEY` (publishable key only)
- `ANDROID_GOOGLE_WEB_CLIENT_ID`

The `.env.example` documents the fields; Gradle does not automatically load `.env`.
Missing/invalid configuration keeps Google login unavailable and guest mode local.
Never embed provider secrets, service-role keys or personal tokens in the APK.
See [provider setup and acceptance gate](../docs/architecture/android-a2-auth.md).

## Data and lifecycle

Guest sessions and profile/workout/goal/hydration drafts remain temporary. Logout
and account changes clear those drafts and timers. Only the refresh token is
persisted, encrypted with Android Keystore in no-backup storage. Restoring the app
requires a successful server refresh and user verification; a stored UID is never
accepted as authentication. Old prototype identity preferences are removed once.
Offline logout clears local state and reports uncertainty about remote revocation.
Automatic app backup remains disabled.

## Source synchronization

The A0 manifest records the original AI Studio export and must remain unchanged.
GitHub commits do not prove AI Studio uses the same source. Synchronize the reviewed
revision explicitly, compare the resulting export and validate real login on the
actual signed build before claiming parity. Follow [the roadmap](../docs/ROADMAP.md)
and [A2 validation](../docs/architecture/android-a2-auth.md).
