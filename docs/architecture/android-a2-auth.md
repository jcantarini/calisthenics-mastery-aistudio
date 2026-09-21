# A2 — Verified Android authentication and session isolation

Status: implementation and CI validation in progress; NOT approved for live authentication.
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
Core-library desugaring 2.1.5 preserves minSdk 24. No web dependencies changed.
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
No live user credentials were used.

Supply only these PUBLIC build properties, through local Gradle properties or env:

- ANDROID_SUPABASE_URL: the verified HTTPS project URL.
- ANDROID*SUPABASE_PUBLISHABLE_KEY: sb_publishable*...; legacy JWT and secret keys are rejected.
- ANDROID_GOOGLE_WEB_CLIENT_ID: the OAuth **Web** client ID accepted by Supabase.

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

Pending independent native assembly, unit/Compose tests, lint and Android Keystore
instrumentation. Tests cover unavailable config, cancellation, provider/SDK rejection,
nonce handling, secure storage/tampering, recreation, refresh serialization, timeout,
offline logout and stale account responses. Live Google sign-in, actual signed APK
provider setup, real restart/refresh/logout and AI Studio import/export parity remain
required before A2 approval. Simulated HTTP tests are not provider homologation.

## References

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/reference/kotlin/installing
- https://github.com/supabase-community/supabase-kt/tree/3.2.2
- https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
- https://developer.android.com/privacy-and-security/keystore
