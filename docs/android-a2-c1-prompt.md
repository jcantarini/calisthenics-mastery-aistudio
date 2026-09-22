# A2-C1 — Authentication Validation & Provider Homologation

Continue the Android/Kotlin primary app from branch `android/a2-auth`, draft PR #4
in `jcantarini/calisthenics-mastery-aistudio`. Its base is A1 PR #3; do not merge or
rebase onto web-only main automatically. Read `AGENTS.md`, `android/AGENTS.md`,
`docs/ROADMAP.md`, `docs/architecture/android-a2-auth.md` and the normative ADR 0005
contracts first. This is a corrective/acceptance step, not permission to start A3.

## 1. Recover and identify the exact source

- Inspect the branch, PR and local follow-up commit before changing anything.
- The initial A2 commit is `50cb3bc59f9bcd12a5d27cf7c1dd9671e760f67c`; the
  published corrective code commit is `a5b83ffeff0a55d8854dded398569211582689a7`.
  Read the validation record for later documentation commits and CI results.
- A follow-up replaces the forbidden LocalContext-to-Activity cast with
  LocalActivity, fences late authentication responses and revokes discarded remote
  sessions when possible, bounds provider cleanup, and attempts ciphertext removal
  even if Keystore key removal fails. Preserve the associated regression tests.
- These changes are already published on the A2 branch. Do not reapply a stale
  patch or overwrite newer collaborator changes.
- The previous GitHub connector returned HTTP 400 `Invalid MCP request metadata`
  and recovered on continuation. Recheck access if necessary;
  never request personal tokens in chat. Record whether the correction is actually
  pushed. A local commit alone is not a published GitHub change.

## 2. Preserve automated validation

Use the pinned JDK 21, Gradle 9.3.1, AGP 9.1.1, SDK 36.1 and build-tools 36.0.0.
The code tree at `a5b83ff` already passed assembly, unit/Compose tests, lint and
Android Keystore instrumentation in run `35752315322`; web run `35752315172` also
passed (370 tests). Verify the current source matches that evidence. Reuse it for
unchanged executable inputs; rerun assembly, unit/Compose tests, lint and Keystore
instrumentation if code or build inputs change. The real configured/signed build
still needs the device scenarios below.
Resolve real failures without disabling checks, reducing test SDKs or hiding skips.
The application/test dependency lock is already committed. Preserve it and verify
normal CI without `--write-locks`. Never leave a CI step that regenerates the lock
as an acceptance shortcut. Keep web dependency files unchanged.

Report exact source SHA, CI links and available report counts. The local ZIP
artifact fetch returned 403, so exact unit/skipped/native-warning counts were not
extracted; retrieve them if accessible, without inventing them or treating that
report-download limitation as an application defect. Two instrumented tests and
370 web tests are confirmed by logs. The initial lint failure was fixed and the
corrected Android job passed. Do not use results to approve changed untested code.

## 3. Verify the provider without changing shared settings silently

Confirm read access to the existing Supabase project and Google Cloud OAuth setup.
Check the existing Google provider accepts the intended Web OAuth client, nonce
verification remains enabled, and consent/test-user setup permits the test account.
The Android OAuth registration must match package
`com.aistudio.calisthenicsmastery.app` and the SHA-1 of the actual development build's
signing certificate, in the same Google project as the Web client. Obtain it with
`:app:signingReport`; do not substitute the ephemeral CI runner certificate.

Supply only public build properties:

- `ANDROID_SUPABASE_URL`
- `ANDROID_SUPABASE_PUBLISHABLE_KEY`
- `ANDROID_GOOGLE_WEB_CLIENT_ID`

Provider/client secrets remain exclusively in provider administration. No privileged
key enters Android, Git, logs or chat. If access or a shared-provider change is
required, document the concrete missing configuration/impact and obtain authorization
before that external change. No database migration is needed for this sprint.

## 4. Homologate the actual signed Android app

Synchronize/import the reviewed GitHub revision into AI Studio. Compare a fresh
source export, accounting explicitly for platform-generated files. A commit in
GitHub does not establish which revision AI Studio is running.

On the actual signed build, verify and record evidence for:

1. Missing configuration leaves Google unavailable; guest mode remains clearly local.
2. Real Google login produces a server-verified Supabase user ID.
3. Cancelled/failed Google login never creates a fake or authenticated identity.
4. App restart restores only through successful server refresh and user verification.
5. Token renewal and background/foreground transitions do not duplicate refreshes.
6. Logout clears identity, drafts and timers immediately; offline logout reports
   uncertain remote revocation without pretending synchronization succeeded.
7. Account A to B, guest entry and late callbacks never restore A's state into B.
8. Expired/rejected sessions, network failure and lost/corrupted Keystore data fail
   closed with a recoverable sign-in state.
9. No plaintext token persistence, token logging, fake rewards, direct canonical
   history writes or privileged credentials are introduced.

Human sign-in may require the account owner. Never invent passing live evidence
from mocks, a compiled APK or a screenshot of an unrelated revision.

## 5. Scope and acceptance

Do not implement A3, rewards, workout ingestion, outbox, schema changes or release
publishing. Keep all 21 existing migrations, web files and the historical A0 source
manifest unchanged. No PR merge or shared provider/database deployment is authorized.

Update the roadmap and A2 validation record with source SHA and evidence. Mark
`A2 APPROVED — READY FOR A3` only after automated checks, provider verification,
live-device scenarios and AI Studio source synchronization all pass. Otherwise use
`A2 IMPLEMENTED — VALIDATION/HOMOLOGATION BLOCKED`, list the actual blockers and
provide the smallest continuation prompt. Tests not run must be reported as not run.

Return changes, published/local status, validation results, remaining blockers and
the updated roadmap. Provide an A3 prompt only if A2 is fully approved.
