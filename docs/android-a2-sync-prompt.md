# A2-C1 — Correct AI Studio source synchronization

Use the attached `calisthenics-android-a2-bf00310.zip` as the exact Android source.
It contains 63 tracked files from `android/` at commit
`bf00310db8ed3be1f80c0d8d1f508932e8700e0d` in
`jcantarini/calisthenics-mastery-aistudio`, branch `android/a2-auth`, draft PR #4.
The ZIP root is the Android project root: `app/`, `gradle/` and Gradle build files.
Do not nest it under another `android/` in the existing Android editor.

ZIP SHA-256: `ab43d662eb17aa39fcd0e3608ec8109ea7e7ab4b52783e7d586908649c40a076`.
Per-file checksums are in [android-a2-sync-manifest.json](./android-a2-sync-manifest.json).
The source ZIP and this manifest are input evidence, not proof of a successful import.

## Scope

1. Preserve a recoverable checkpoint/export of the current editor before replacing
   sources. Confirm this is the intended Android app; do not overwrite the web project.
2. Import the attached reviewed source exactly. Do not regenerate or approximate
   it from this description. If the platform cannot read/import the archive,
   stop and report that specific limitation without pretending synchronization.
3. Preserve private environment configuration and signing material outside source
   control; do not print or copy it into the archive, Kotlin or commit. Do not
   silently replace the source with web-only main or push the old editor to A2.
4. Preserve the A1 containment and A2 implementation: verified server identity,
   Credential Manager, encrypted refresh-token storage, lifecycle handling,
   generation fencing, bounded cleanup and all regression tests. No simulated
   authenticated identity, direct canonical history writes, rewards or cloud sync.
5. Keep application ID `com.aistudio.calisthenicsmastery.app`, JDK 21, Gradle 9.3.1,
   AGP 9.1.1, SDK 36.1 and the committed dependency lock. Do not regenerate the lock
   or downgrade dependencies to make a build pass.
6. Reconcile extra editor files explicitly. Platform metadata/config differences
   must be listed. Do not retain conflicting obsolete source files or delete
   unreviewed user work silently. The historical A0 manifest remains immutable.

## Validation

- Confirm `auth/SessionController.kt`, `auth/KeystoreSessionVault.kt` and the other
  A2 auth sources exist; MainActivity uses `LocalActivity`, not an Activity cast.
- Compare every imported source/build/test file with the manifest. A file count or
  name check alone is insufficient. Report missing, modified and extra paths.
- Export a fresh source ZIP for independent comparison. Account separately for
  platform-generated files; never waive executable/build differences silently.
- Run `./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug`
  in the configured Android environment. Record actual results and build identity.
  Do not claim the old CI run validates any newly changed input.
- Missing public auth configuration must keep Google unavailable and guest mode
  local. A build with no credentials does not validate real Google authentication.
- No shared Supabase/provider changes, migrations, merges, release signing or APK
  publication. Do not implement A3 or approve A2 during this correction.

Return imported commit, file comparison, actual build results, all platform
adjustments and the fresh export. Checks not run must say not run. Only after
source parity passes, resume `docs/android-a2-c1-prompt.md` for provider verification
and real login/refresh/logout/account-switch testing. The authentication acceptance
marker remains `A2 IMPLEMENTED — VALIDATION/HOMOLOGATION BLOCKED` until all gates pass.
