@file:OptIn(kotlin.time.ExperimentalTime::class, kotlinx.coroutines.ExperimentalCoroutinesApi::class)

package com.example

import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.GetCredentialUnsupportedException
import androidx.credentials.exceptions.NoCredentialException
import com.example.auth.*
import io.github.jan.supabase.auth.*
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.logging.LogLevel
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.UnknownHostException

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class AuthDiagnosticsTest {

  private val testConfig = AuthConfiguration(
    "https://project.supabase.co",
    "sb_publishable_1234567890123456",
    "123-client.apps.googleusercontent.com"
  )

  private class MockVault : SessionVault {
    var stored: String? = null
    var failWrite = false
    override fun read() = stored
    override fun write(refreshToken: String) {
      if (failWrite) throw IllegalStateException("disk failure")
      stored = refreshToken
    }
    override fun clear() { stored = null }
  }

  @Test
  fun sanitizationNeverExposesTokensEmailsOrUrlsAndHandlesSyntheticInputs() {
    val sensitivePayload = "https://sensitive.supabase.co/auth/v1/token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user@corp.com"
    val exception = RuntimeException(sensitivePayload)
    val diag = AuthDiagnostics.sanitize(AuthStage.TROCA_ID_TOKEN_SUPABASE, exception, isDebug = true)

    assertNotNull(diag)
    assertEquals(AuthStage.TROCA_ID_TOKEN_SUPABASE, diag!!.stage)
    assertEquals("RuntimeException", diag.exceptionClass)
    assertNull(diag.httpStatus)
    assertNull(diag.providerErrorCode)
  }

  @Test
  fun unknownCodesAreMappedToUnknownOrOmittedAndNeverUseArbitraryTruncatedStrings() = runTest {
    val gateway = SupabaseAuthGateway(testConfig) {
      createSupabaseClient(testConfig.supabaseUrl, testConfig.publishableKey) {
        httpEngine = MockEngine {
          respond(
            content = """{"error":"random_unlisted_code_xyz","error_description":"token eyJ123"}""",
            status = HttpStatusCode.BadRequest,
            headers = headersOf(HttpHeaders.ContentType, "application/json")
          )
        }
        defaultLogLevel = LogLevel.NONE
        install(Auth) {
          autoLoadFromStorage = false
          autoSaveToStorage = false
          alwaysAutoRefresh = false
          enableLifecycleCallbacks = false
          sessionManager = MemorySessionManager()
          codeVerifierCache = MemoryCodeVerifierCache()
        }
      }
    }

    try {
      gateway.signIn("id-token", "nonce")
      fail("Expected AuthDiagnosticException")
    } catch (e: AuthDiagnosticException) {
      val diag = AuthDiagnostics.sanitize(e.stage, e.cause, isDebug = true)
      assertNotNull(diag)
      assertEquals("UNKNOWN", diag!!.providerErrorCode)
      assertEquals(400, diag.httpStatus)
    }
  }

  @Test
  fun knownStructuredCodesAndHttpStatusAreMappedAccurately() = runTest {
    val gateway = SupabaseAuthGateway(testConfig) {
      createSupabaseClient(testConfig.supabaseUrl, testConfig.publishableKey) {
        httpEngine = MockEngine {
          respond(
            content = """{"code":400,"error_code":"invalid_grant","msg":"user denied"}""",
            status = HttpStatusCode.BadRequest,
            headers = headersOf(HttpHeaders.ContentType, "application/json")
          )
        }
        defaultLogLevel = LogLevel.NONE
        install(Auth) {
          autoLoadFromStorage = false
          autoSaveToStorage = false
          alwaysAutoRefresh = false
          enableLifecycleCallbacks = false
          sessionManager = MemorySessionManager()
          codeVerifierCache = MemoryCodeVerifierCache()
        }
      }
    }

    try {
      gateway.signIn("id-token", "nonce")
      fail("Expected AuthDiagnosticException")
    } catch (e: AuthDiagnosticException) {
      val diag = AuthDiagnostics.sanitize(e.stage, e.cause, isDebug = true)
      assertNotNull(diag)
      assertEquals("invalid_grant", diag!!.providerErrorCode)
      assertEquals(400, diag.httpStatus)
    }

    val credEx = GetCredentialProviderConfigurationException("config")
    val credDiag = AuthDiagnostics.sanitize(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, credEx, isDebug = true)
    assertNotNull(credDiag)
    assertEquals("GET_CREDENTIAL_CONFIGURATION_ERROR", credDiag!!.providerErrorCode)

    val unsuppEx = GetCredentialUnsupportedException("unsupported")
    val unsuppDiag = AuthDiagnostics.sanitize(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, unsuppEx, isDebug = true)
    assertNotNull(unsuppDiag)
    assertEquals("GET_CREDENTIAL_UNSUPPORTED", unsuppDiag!!.providerErrorCode)

    val noCredEx = NoCredentialException("none")
    val noCredDiag = AuthDiagnostics.sanitize(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, noCredEx, isDebug = true)
    assertNotNull(noCredDiag)
    assertEquals("NO_CREDENTIAL", noCredDiag!!.providerErrorCode)

    val netEx = UnknownHostException("project.supabase.co")
    val netDiag = AuthDiagnostics.sanitize(AuthStage.TROCA_ID_TOKEN_SUPABASE, netEx, isDebug = true)
    assertNotNull(netDiag)
    assertEquals("NETWORK_ERROR", netDiag!!.providerErrorCode)
  }

  @Test
  fun releaseModeSuppressesAllDetailedDiagnostic() {
    val credEx = GetCredentialProviderConfigurationException("config")
    val diag = AuthDiagnostics.sanitize(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, credEx, isDebug = false)
    assertNull(diag)
  }

  @Test
  fun stageIsPropagatedToSessionControllerStateForObtainFailure() = runTest {
    val vault = MockVault()
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String) = error("unused")
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn {
      throw AuthDiagnosticException(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, GetCredentialProviderConfigurationException())
    }
    runCurrent()

    val state = controller.state.value
    assertEquals(AuthPhase.ERROR, state.phase)
    assertNotNull(state.diagnostic)
    assertEquals(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, state.diagnostic!!.stage)
  }

  @Test
  fun stageIsPropagatedToSessionControllerStateForTokenExtractionFailure() = runTest {
    val vault = MockVault()
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String) = error("unused")
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn { "" } // blank token triggers EXTRACAO_ID_TOKEN
    runCurrent()

    val state = controller.state.value
    assertEquals(AuthPhase.ERROR, state.phase)
    assertNotNull(state.diagnostic)
    assertEquals(AuthStage.EXTRACAO_ID_TOKEN, state.diagnostic!!.stage)
    assertEquals("AUTH_REJECTED", state.diagnostic!!.providerErrorCode)
  }

  @Test
  fun stageIsPropagatedToSessionControllerStateForSupabaseExchangeFailure() = runTest {
    val vault = MockVault()
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String): AuthSession {
          throw AuthDiagnosticException(
            AuthStage.TROCA_ID_TOKEN_SUPABASE,
            UnknownHostException("network unavailable")
          )
        }
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn { "valid-google-id-token" }
    runCurrent()

    val state = controller.state.value
    assertEquals(AuthPhase.ERROR, state.phase)
    assertNotNull(state.diagnostic)
    assertEquals(AuthStage.TROCA_ID_TOKEN_SUPABASE, state.diagnostic!!.stage)
    assertEquals("NETWORK_ERROR", state.diagnostic!!.providerErrorCode)
  }

  @Test
  fun stageIsPropagatedToSessionControllerStateForRemoteUserVerificationFailure() = runTest {
    val vault = MockVault()
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String): AuthSession {
          throw AuthDiagnosticException(AuthStage.VERIFICACAO_REMOTA_USUARIO, AuthRejected())
        }
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn { "valid-google-id-token" }
    runCurrent()

    val state = controller.state.value
    assertEquals(AuthPhase.ERROR, state.phase)
    assertNotNull(state.diagnostic)
    assertEquals(AuthStage.VERIFICACAO_REMOTA_USUARIO, state.diagnostic!!.stage)
    assertEquals("AUTH_REJECTED", state.diagnostic!!.providerErrorCode)
  }

  @Test
  fun stageIsPropagatedToSessionControllerStateForStoragePersistenceFailure() = runTest {
    val vault = MockVault().apply { failWrite = true }
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String) =
          AuthSession(VerifiedUser("usr-123"), "acc", "ref", 9999999999L)
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn { "valid-google-id-token" }
    runCurrent()

    val state = controller.state.value
    assertEquals(AuthPhase.ERROR, state.phase)
    assertNotNull(state.diagnostic)
    assertEquals(AuthStage.PERSISTENCIA_SESSAO, state.diagnostic!!.stage)
    assertEquals("SECURE_STORAGE_ERROR", state.diagnostic!!.providerErrorCode)
  }

  @Test
  fun preservesCancellationAndTimeoutFlows() = runTest {
    val vault = MockVault()
    val controller = SessionController(
      gateway = object : AuthGateway {
        override suspend fun signIn(idToken: String, rawNonce: String) =
          AuthSession(VerifiedUser("usr-123"), "acc", "ref", 9999999999L)
        override suspend fun refresh(refreshToken: String) = error("unused")
        override suspend fun signOut(accessToken: String) {}
      },
      vault = vault,
      scope = backgroundScope
    )

    controller.signIn { throw LoginCancelled() }
    runCurrent()
    assertEquals(AuthPhase.ERROR, controller.state.value.phase)
    assertNull(controller.state.value.diagnostic) // Cancellation produces user notice, not technical diagnostic
  }
}
