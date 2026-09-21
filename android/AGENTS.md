# Android primary application — audit baseline

The user selected Android/Kotlin as the primary client. This directory starts from
the AI Studio export recorded in `../docs/architecture/android-native-audit.md`.
Its current prototype is NOT release-ready. Read that audit, `../docs/ROADMAP.md`
and the ratified ADR 0005/contracts before editing.

- Preserve the web code as a reference until parity is demonstrated.
- Do not inherit web test approval for native code.
- Never create authenticated identities from manually entered names/emails.
- The APK is an untrusted client. No service-role credentials or direct writes to
  canonical reward-bearing history; preserve the server boundary.
- Do not change existing database migrations or shared providers as a shortcut.
- A1 establishes reproducible builds and contains prototype behavior; A2 handles
  real authentication. Record tests not run honestly.
- Document AI Studio/GitHub synchronization; a GitHub commit alone does not prove
  the AI Studio editor or its preview uses that commit.
