# Android — A1 containment baseline

Android/Kotlin is the primary client. This is an explicitly local, temporary guest
prototype, not a release or a verified cloud client. Google sign-in, synchronization,
canonical history and rewards are unavailable until their roadmap gates pass.

## Reproduce validation

Use JDK 21 (required by Robolectric with SDK 36), Android SDK platform 36.1, build-tools 36.0.0 and platform-tools.
Set ANDROID_HOME to your SDK installation or supply an untracked local.properties.
From this directory run:

```sh
./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

On Windows use gradlew.bat. Gradle 9.3.1 and AGP 9.1.1 remain the exported versions.
The official wrapper JAR and distribution checksums are verified by Android CI.
No Firebase configuration, cloud keys or .env file are needed for A1. Never embed
service-role credentials in an APK. Debug signing uses the Android-generated local
keystore; AI Studio can explicitly set AI_STUDIO_DEBUG_KEYSTORE to its debug key.
Release signing and distribution are outside this stage.

## Data and lifecycle

Every guest entry starts clean. Logout resets profile, goals, hydration, program,
workout and timer state. Process recreation starts signed out. Old prototype
identity/token preferences are cleared rather than accepted as authentication.
Hydration and goal edits are temporary local drafts, never canonical cloud facts.
Backup excludes preferences and automatic app backup is disabled.

## Source synchronization

The A0 source manifest records the original AI Studio export and must not be
rewritten to describe A1. GitHub changes do not automatically prove that AI Studio
uses the same revision. Import/synchronize the reviewed A1 revision explicitly,
then compare its export and validate on a device before claiming AI Studio parity.
See ../docs/ROADMAP.md and ../docs/architecture/android-a1-validation.md.
