package com.example

import com.example.auth.*
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SessionControllerTest {
  private class Vault : SessionVault {
    var token: String? = null
    var broken = false
    override fun read() = token
    override fun write(refreshToken: String) { if (broken) error("disk failure"); token = refreshToken }
    override fun clear() { token = null }
  }
  private class Gateway : AuthGateway {
    var signs = 0; var refreshes = 0; var out = 0
    var failure = false; var logoutFailure = false
    var gate: CompletableDeferred<Unit>? = null
    var userId = "verified-supabase-user"
    var expiry = 4000L
    var receivedNonce = ""
    override suspend fun signIn(idToken: String, rawNonce: String): AuthSession {
      signs++; receivedNonce = rawNonce
      // Intentionally ignores cancellation to exercise the generation fence.
      gate?.let { withContext(NonCancellable) { it.await() } }
      if (failure) throw AuthRejected()
      return AuthSession(VerifiedUser(userId), "access-$signs", "refresh-$signs", expiry)
    }
    override suspend fun refresh(refreshToken: String): AuthSession {
      refreshes++
      gate?.let { withContext(NonCancellable) { it.await() } }
      if (failure) throw AuthRejected()
      return AuthSession(VerifiedUser(userId), "access-new", "refresh-new", expiry)
    }
    override suspend fun signOut(accessToken: String) { out++; if (logoutFailure) error("offline") }
  }
  @Test fun missingConfigNeverOpensProviderOrCreatesIdentity() = runTest {
    val v = Vault(); val c = SessionController(null, v, backgroundScope)
    c.signIn { error("must not open credential picker") }; runCurrent()
    assertEquals(AuthPhase.ERROR, c.state.value.phase); assertNull(c.state.value.user); assertNull(v.token)
  }
  @Test fun successPersistsOnlyRefreshAndUsesFreshNonce() = runTest {
    val v = Vault(); val g = Gateway(); val c = SessionController(g,v,backgroundScope,{1000})
    var hashed = ""
    c.signIn { hashed=it; "google-token" };runCurrent()
    assertEquals(AuthPhase.AUTHENTICATED,c.state.value.phase)
    assertEquals(g.userId,c.state.value.user!!.id);assertEquals("refresh-1",v.token)
    val expected=java.security.MessageDigest.getInstance("SHA-256").digest(g.receivedNonce.toByteArray()).joinToString("") { "%02x".format(it) }
    assertEquals(expected,hashed);val previous=g.receivedNonce
    c.signIn { "google-token" };runCurrent();assertNotEquals(previous,g.receivedNonce)
  }
  @Test fun cancellationAndProviderFailureNeverLogIn() = runTest {
    val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope)
    c.signIn { throw LoginCancelled() };runCurrent();assertEquals(AuthPhase.ERROR,c.state.value.phase)
    c.signIn { error("provider denied") };runCurrent();assertNull(c.state.value.user);assertEquals(0,g.signs)
  }
  @Test fun rejectedExchangeAndBrokenStorageFailClosed() = runTest {
    val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{1000})
    g.failure=true;c.signIn { "google" };runCurrent();assertNull(c.state.value.user)
    g.failure=false;v.broken=true;c.signIn { "google" };runCurrent();assertEquals(AuthPhase.ERROR,c.state.value.phase);assertNull(v.token)
  }
  @Test fun logoutIsImmediateAndLateSignInCannotRestoreAccount() = runTest {
    val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{1000})
    g.gate=CompletableDeferred();c.signIn { "google" };runCurrent()
    c.signOut();assertEquals(AuthPhase.SIGNED_OUT,c.state.value.phase)
    g.gate!!.complete(Unit);runCurrent();assertNull(c.state.value.user);assertNull(v.token);assertEquals(1,g.out)
  }
  @Test fun guestEntryFencesPendingLogin() = runTest {
    val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{1000})
    g.gate=CompletableDeferred();c.signIn { "google" };runCurrent();c.enterGuest()
    g.gate!!.complete(Unit);runCurrent();assertEquals(AuthPhase.GUEST,c.state.value.phase);assertNull(v.token)
  }
  @Test fun recreationVerifiesRefreshWithServerInsteadOfTrustingLocalIdentity() = runTest {
    val v=Vault();v.token="stored";val g=Gateway();val c=SessionController(g,v,backgroundScope,{1000})
    c.restore();runCurrent();assertEquals(1,g.refreshes);assertEquals(AuthPhase.AUTHENTICATED,c.state.value.phase)
    g.failure=true;val next=SessionController(g,v,backgroundScope,{1000});next.restore();runCurrent()
    assertEquals(AuthPhase.ERROR,next.state.value.phase);assertNull(v.token)
  }
  @Test fun concurrentRenewalUsesRotatedRefreshTokenOnlyOnce() = runTest {
    var now=1000L;val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{now})
    c.signIn { "google" };runCurrent();now=3970;g.expiry=8000
    repeat(4) { c.refreshIfNeeded() };runCurrent()
    assertEquals(1,g.refreshes);assertEquals("refresh-new",v.token)
  }
  @Test fun expiredRefreshCannotRestoreAfterLogout() = runTest {
    var now=1000L;val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{now})
    c.signIn { "google" };runCurrent();now=3970;g.expiry=8000;g.gate=CompletableDeferred()
    c.refreshIfNeeded();runCurrent();c.signOut();g.gate!!.complete(Unit);runCurrent()
    assertNull(v.token);assertNull(c.state.value.user)
  }
  @Test fun offlineLogoutClearsLocalStateAndReportsRemoteUncertainty() = runTest {
    val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{1000})
    c.signIn { "google" };runCurrent();g.logoutFailure=true;c.signOut()
    assertNull(c.state.value.user);assertNull(v.token);runCurrent()
    assertEquals(1,g.out);assertTrue(c.state.value.message!!.contains("servidor"))
  }
  @Test fun refreshCannotChangeTheVerifiedUser() = runTest {
    var now=1000L;val v=Vault();val g=Gateway();val c=SessionController(g,v,backgroundScope,{now})
    c.signIn { "google" };runCurrent();now=3970;g.userId="other";g.expiry=8000;c.refreshIfNeeded();runCurrent()
    assertNull(c.state.value.user);assertNull(v.token);assertEquals(1,g.out)
  }
  @Test fun providerCleanupTimeoutDoesNotPreventRemoteLogout() = runTest {
    val v=Vault();val g=Gateway()
    val c=SessionController(g,v,backgroundScope,{1000},clearProvider={ delay(30_000) })
    c.signIn { "google" };runCurrent();c.signOut();runCurrent()
    assertNull(c.state.value.user);assertNull(v.token)
    advanceTimeBy(5_001);runCurrent()
    assertEquals(1,g.out);assertEquals(AuthPhase.SIGNED_OUT,c.state.value.phase)
  }
  @Test fun expiredServerSessionIsRejected() = runTest {
    val v=Vault();val g=Gateway();g.expiry=999;val c=SessionController(g,v,backgroundScope,{1000})
    c.signIn { "google" };runCurrent();assertEquals(AuthPhase.ERROR,c.state.value.phase);assertNull(v.token)
  }
  @Test fun sdkTimeoutLeavesRecoverableErrorInsteadOfLoadingForever() = runTest {
    val v=Vault();val g=object: AuthGateway {
      override suspend fun signIn(idToken:String,rawNonce:String):AuthSession { delay(30_000);error("unreachable") }
      override suspend fun refresh(refreshToken:String):AuthSession=error("unused")
      override suspend fun signOut(accessToken:String) {}
    }
    val c=SessionController(g,v,backgroundScope);c.signIn { "google" };runCurrent();advanceTimeBy(20_001);runCurrent()
    assertEquals(AuthPhase.ERROR,c.state.value.phase);assertNull(v.token)
  }
  @Test fun publicConfigRejectsSecretKeysAndWrongEndpoints() {
    val valid=AuthConfiguration("https://project.supabase.co","sb_publishable_1234567890123456","123-client.apps.googleusercontent.com")
    assertTrue(valid.isValid)
    assertFalse(valid.copy(publishableKey="sb_secret_1234567890123456").isValid)
    assertFalse(valid.copy(publishableKey="eyJhbGci.jwt.signature").isValid)
    assertFalse(valid.copy(supabaseUrl="http://project.supabase.co").isValid)
    assertFalse(valid.copy(supabaseUrl="https://project.supabase.co.evil.example").isValid)
    assertFalse(valid.copy(googleWebClientId="YOUR_WEB_CLIENT_ID").isValid)
  }
}
