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
import kotlinx.coroutines.CancellationException

/** Every operation uses an isolated SDK client so stale requests cannot replace another session. */
class SupabaseAuthGateway(
  private val config: AuthConfiguration,
  private val clientFactory: (() -> SupabaseClient)? = null
) : AuthGateway {
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
    val user = try {
      client.auth.retrieveUser(session.accessToken)
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      throw AuthDiagnosticException(AuthStage.VERIFICACAO_REMOTA_USUARIO, e)
    }
    if (user.id.isBlank() || user.id != session.user?.id) {
      throw AuthDiagnosticException(AuthStage.VERIFICACAO_REMOTA_USUARIO, AuthRejected())
    }
    return AuthSession(VerifiedUser(user.id), session.accessToken, session.refreshToken, session.expiresAt.epochSeconds)
  }

  override suspend fun signIn(idToken: String, rawNonce: String): AuthSession {
    val client = client()
    try {
      try {
        client.auth.signInWith(IDToken) { this.idToken = idToken; provider = Google; nonce = rawNonce }
      } catch (e: CancellationException) {
        throw e
      } catch (e: Exception) {
        throw AuthDiagnosticException(AuthStage.TROCA_ID_TOKEN_SUPABASE, e)
      }
      val session = client.auth.currentSessionOrNull()
        ?: throw AuthDiagnosticException(AuthStage.TROCA_ID_TOKEN_SUPABASE, AuthRejected())
      return verified(client, session)
    } finally {
      client.close()
    }
  }

  override suspend fun refresh(refreshToken: String): AuthSession {
    val client = client()
    try {
      val session = try {
        client.auth.refreshSession(refreshToken)
      } catch (e: CancellationException) {
        throw e
      } catch (e: Exception) {
        throw AuthDiagnosticException(AuthStage.TROCA_ID_TOKEN_SUPABASE, e)
      }
      return verified(client, session)
    } finally {
      client.close()
    }
  }

  override suspend fun signOut(accessToken: String) {
    val client = client()
    try {
      client.auth.importAuthToken(accessToken, autoRefresh = false)
      client.auth.signOut(SignOutScope.LOCAL)
    } finally {
      client.close()
    }
  }
}
