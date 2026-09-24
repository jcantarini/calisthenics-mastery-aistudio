@file:OptIn(kotlin.time.ExperimentalTime::class)
package com.example

import com.example.auth.*
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.*
import io.github.jan.supabase.logging.LogLevel
import io.ktor.client.engine.mock.*
import io.ktor.http.*
import io.ktor.http.content.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class SupabaseAuthGatewayTest {
  private val config=AuthConfiguration("https://project.supabase.co", "sb_publishable_1234567890123456", "123-client.apps.googleusercontent.com")
  private val user="""{"id":"00000000-0000-0000-0000-000000000001","aud":"authenticated","role":"authenticated","created_at":"2026-01-01T00:00:00Z"}"""
  private fun gateway(engine: MockEngine) = SupabaseAuthGateway(config) {
    createSupabaseClient(config.supabaseUrl,config.publishableKey) {
      httpEngine=engine;defaultLogLevel=LogLevel.NONE
      install(Auth) { autoLoadFromStorage=false;autoSaveToStorage=false;alwaysAutoRefresh=false;enableLifecycleCallbacks=false;sessionManager=MemorySessionManager();codeVerifierCache=MemoryCodeVerifierCache() }
    }
  }
  @Test fun exchangesGoogleNonceAndVerifiesUserUsingTheIssuedBearer() = runTest {
    val paths=mutableListOf<String>()
    val g=gateway(MockEngine { request ->
      paths+=request.url.encodedPath
      assertEquals(config.publishableKey,request.headers["apikey"])
      if (request.url.encodedPath.endsWith("/token")) {
        assertEquals("id_token",request.url.parameters["grant_type"])
        val body=(request.body as TextContent).text
        assertTrue(body.contains("google-id-token"));assertTrue(body.contains("raw-nonce"));assertTrue(body.contains("google"))
        respond("""{"access_token":"issued-access","refresh_token":"issued-refresh","token_type":"bearer","expires_in":3600,"user":$user}""",headers=headersOf(HttpHeaders.ContentType,"application/json"))
      } else {
        assertEquals("/auth/v1/user",request.url.encodedPath)
        assertEquals("Bearer issued-access",request.headers[HttpHeaders.Authorization])
        respond(user,headers=headersOf(HttpHeaders.ContentType,"application/json"))
      }
    })
    val session=g.signIn("google-id-token","raw-nonce")
    assertEquals("00000000-0000-0000-0000-000000000001",session.user.id)
    assertEquals(listOf("/auth/v1/token","/auth/v1/user"),paths)
  }
  @Test fun rejectedTokenExchangeNeverReturnsASession() = runTest {
    val g=gateway(MockEngine { respond("""{"error":"invalid_grant","error_description":"denied"}""",HttpStatusCode.BadRequest,headersOf(HttpHeaders.ContentType,"application/json")) })
    try { g.signIn("invalid-token","nonce");fail("rejected exchange succeeded") } catch (_:Exception) {}
  }
}
