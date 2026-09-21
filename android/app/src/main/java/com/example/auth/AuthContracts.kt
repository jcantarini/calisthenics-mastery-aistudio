package com.example.auth

/** Never use display metadata as authorization. Only Supabase's verified ID is an identity. */
data class VerifiedUser(val id: String)
class AuthSession(val user: VerifiedUser, internal val accessToken: String,
  internal val refreshToken: String, val expiresAtSeconds: Long) {
  override fun toString() = "AuthSession([REDACTED])"
}
interface AuthGateway {
  suspend fun signIn(idToken: String, rawNonce: String): AuthSession
  suspend fun refresh(refreshToken: String): AuthSession
  suspend fun signOut(accessToken: String)
}
interface SessionVault {
  fun read(): String?
  fun write(refreshToken: String)
  fun clear()
}
enum class AuthPhase { SIGNED_OUT, GUEST, LOADING, AUTHENTICATED, ERROR }
data class AuthState(val phase: AuthPhase = AuthPhase.SIGNED_OUT,
  val user: VerifiedUser? = null, val message: String? = null)
class LoginCancelled : Exception()
class AuthRejected : Exception()
