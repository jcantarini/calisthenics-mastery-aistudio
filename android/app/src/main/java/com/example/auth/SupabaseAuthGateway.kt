@file:OptIn(kotlin.time.ExperimentalTime::class)
package com.example.auth

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.MemorySessionManager
import io.github.jan.supabase.auth.MemoryCodeVerifierCache
import io.github.jan.supabase.auth.SignOutScope
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.user.UserSession
import io.github.jan.supabase.logging.LogLevel
import io.ktor.client.engine.okhttp.OkHttp

/** Every operation uses an isolated SDK client so stale requests cannot replace another session. */
class SupabaseAuthGateway(private val config: AuthConfiguration, private val clientFactory: (() -> SupabaseClient)? = null) : AuthGateway {
  init { require(config.isValid) }
  private fun client() = clientFactory?.invoke() ?: createSupabaseClient(config.supabaseUrl, config.publishableKey) {
    defaultLogLevel = LogLevel.NONE
    httpEngine = OkHttp.create()
    install(Auth) {
      alwaysAutoRefresh = false
      autoLoadFromStorage = false
      autoSaveToStorage = false
      enableLifecycleCallbacks = false
      sessionManager = MemorySessionManager()
      codeVerifierCache = MemoryCodeVerifierCache()
    }
  }
  private suspend fun verified(client: SupabaseClient, session: UserSession): AuthSession {
    val user = client.auth.retrieveUser(session.accessToken)
    if (user.id.isBlank() || user.id != session.user?.id) throw AuthRejected()
    return AuthSession(VerifiedUser(user.id), session.accessToken, session.refreshToken, session.expiresAt.epochSeconds)
  }
  override suspend fun signIn(idToken: String, rawNonce: String): AuthSession {
    val client = client()
    try {
      client.auth.signInWith(IDToken) { this.idToken = idToken; provider = Google; nonce = rawNonce }
      return verified(client, client.auth.currentSessionOrNull() ?: throw AuthRejected())
    } finally { client.close() }
  }
  override suspend fun refresh(refreshToken: String): AuthSession {
    val client = client()
    try { return verified(client, client.auth.refreshSession(refreshToken)) }
    finally { client.close() }
  }
  override suspend fun signOut(accessToken: String) {
    val client = client()
    try { client.auth.importAuthToken(accessToken, autoRefresh = false); client.auth.signOut(SignOutScope.LOCAL) }
    finally { client.close() }
  }
}
