package com.example.auth

/** Never use display metadata as authorization. Only Supabase's verified ID is an identity. */
data class VerifiedUser(val id: String)

class AuthSession(
  val user: VerifiedUser,
  internal val accessToken: String,
  internal val refreshToken: String,
  val expiresAtSeconds: Long
) {
  override fun toString() = "AuthSession([REDACTED])"
}

enum class AuthStage(val description: String) {
  OBTENCAO_CREDENCIAL_GOOGLE("Obtenção da credencial Google"),
  EXTRACAO_ID_TOKEN("Extração do ID token"),
  TROCA_ID_TOKEN_SUPABASE("Troca do ID token por sessão no Supabase"),
  VERIFICACAO_REMOTA_USUARIO("Verificação remota do usuário"),
  PERSISTENCIA_SESSAO("Persistência segura da sessão")
}

data class AuthDiagnostic(
  val stage: AuthStage,
  val exceptionClass: String,
  val httpStatus: Int? = null,
  val providerErrorCode: String? = null
)

class AuthDiagnosticException(
  val stage: AuthStage,
  override val cause: Throwable
) : Exception(cause)

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

data class AuthState(
  val phase: AuthPhase = AuthPhase.SIGNED_OUT,
  val user: VerifiedUser? = null,
  val message: String? = null,
  val diagnostic: AuthDiagnostic? = null
)

class LoginCancelled : Exception()
class AuthRejected : Exception()
