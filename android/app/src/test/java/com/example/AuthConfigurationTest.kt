package com.example

import com.example.auth.AuthConfiguration
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.Base64

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class AuthConfigurationTest {
  private val validUrl = "https://project.supabase.co"
  private val validClientId = "123456789-abcdef.apps.googleusercontent.com"
  private val fixedNow = 1_700_000_000L

  private fun syntheticJwt(
    alg: String? = "HS256",
    role: Any? = "anon",
    ref: Any? = "project",
    exp: Any? = fixedNow + 3600,
    sub: Any? = null,
    includeSub: Boolean = false,
    signature: String = "synthetic-sig",
    rawHeader: String? = null,
    rawPayload: String? = null
  ): String {
    val encoder = Base64.getUrlEncoder().withoutPadding()

    val headerString = rawHeader ?: run {
      val fields = mutableListOf<String>()
      if (alg != null) fields += """"alg":"$alg""""
      fields += """"typ":"JWT""""
      "{" + fields.joinToString(",") + "}"
    }

    val payloadString = rawPayload ?: run {
      val fields = mutableListOf<String>()
      if (role != null) {
        if (role is String) fields += """"role":"$role"""" else fields += """"role":$role"""
      }
      if (ref != null) {
        if (ref is String) fields += """"ref":"$ref"""" else fields += """"ref":$ref"""
      }
      if (exp != null) {
        if (exp is String) fields += """"exp":"$exp"""" else fields += """"exp":$exp"""
      }
      if (includeSub) {
        if (sub == null) fields += """"sub":null"""
        else if (sub is String) fields += """"sub":"$sub""""
        else fields += """"sub":$sub"""
      }
      "{" + fields.joinToString(",") + "}"
    }

    val h = encoder.encodeToString(headerString.toByteArray(Charsets.UTF_8))
    val p = encoder.encodeToString(payloadString.toByteArray(Charsets.UTF_8))
    val s = if (signature == "A") "A" else encoder.encodeToString(signature.toByteArray(Charsets.UTF_8))
    return "$h.$p.$s"
  }

  private fun validateRuntime(url: String, key: String, clientId: String = validClientId, nowSec: Long = fixedNow): Boolean {
    return AuthConfiguration(url, key, clientId, nowEpochSeconds = nowSec).isValid
  }

  @Test
  fun publishableAndAnonKeysAreAcceptedInRuntime() {
    assertTrue(validateRuntime(validUrl, "sb_publishable_1234567890123456"))
    val validAnonNoSub = syntheticJwt(includeSub = false)
    assertTrue(validateRuntime(validUrl, validAnonNoSub))
    val validAnonNullSub = syntheticJwt(sub = null, includeSub = true)
    assertTrue(validateRuntime(validUrl, validAnonNullSub))
  }

  @Test
  fun signatureAIsRejectedInRuntime() {
    // Valid header and payload, but signature segment is "A"
    val jwtWithSigA = syntheticJwt(signature = "A")
    assertFalse("Signature 'A' must be rejected due to Base64URL decoding failure", validateRuntime(validUrl, jwtWithSigA))
  }

  @Test
  fun publishableKeyWithInvalidUrlsAreRejectedInRuntime() {
    val pubKey = "sb_publishable_1234567890123456"
    assertFalse(validateRuntime("http://project.supabase.co", pubKey))
    assertFalse(validateRuntime("https://project.supabase.co:8443", pubKey))
    assertFalse(validateRuntime("https://admin:pass@project.supabase.co", pubKey))
    assertFalse(validateRuntime("https://project.supabase.co?key=value", pubKey))
    assertFalse(validateRuntime("https://project.supabase.co#anchor", pubKey))
    assertFalse(validateRuntime("https://project.supabase.co/extra/path", pubKey))
    assertFalse(validateRuntime("https://project.supabase.co.evil.com", pubKey))
    // Valid paths
    assertTrue(validateRuntime("https://project.supabase.co", pubKey))
    assertTrue(validateRuntime("https://project.supabase.co/", pubKey))
  }

  @Test
  fun differentProjectAnonIsRejectedInRuntime() {
    val otherProjectJwt = syntheticJwt(ref = "other-project")
    assertFalse(validateRuntime(validUrl, otherProjectJwt))
    val differentHostUrl = "https://different.supabase.co"
    assertFalse(validateRuntime(differentHostUrl, syntheticJwt(ref = "project")))
  }

  @Test
  fun serviceRoleAuthenticatedAndSecretKeysAreRejectedInRuntime() {
    val serviceRole = syntheticJwt(role = "service_role")
    assertFalse(validateRuntime(validUrl, serviceRole))
    val authenticated = syntheticJwt(role = "authenticated")
    assertFalse(validateRuntime(validUrl, authenticated))
    assertFalse(validateRuntime(validUrl, "sb_secret_1234567890123456"))
  }

  @Test
  fun subFieldHandlingInRuntime() {
    // Absent sub -> valid
    assertTrue(validateRuntime(validUrl, syntheticJwt(includeSub = false)))
    // null sub -> valid
    assertTrue(validateRuntime(validUrl, syntheticJwt(sub = null, includeSub = true)))
    // empty string sub -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(sub = "", includeSub = true)))
    // whitespace string sub -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(sub = "   ", includeSub = true)))
    // populated user sub -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(sub = "00000000-0000-0000-0000-000000000001", includeSub = true)))
  }

  @Test
  fun expFieldHandlingInRuntime() {
    // Valid integer in the future
    assertTrue(validateRuntime(validUrl, syntheticJwt(exp = fixedNow + 3600)))
    // Exp absent
    assertFalse(validateRuntime(validUrl, syntheticJwt(exp = null)))
    // Exp null
    val nullExpPayload = """{"role":"anon","ref":"project","exp":null}"""
    assertFalse(validateRuntime(validUrl, syntheticJwt(rawPayload = nullExpPayload)))
    // Exp string
    assertFalse(validateRuntime(validUrl, syntheticJwt(exp = "${fixedNow + 3600}")))
    // Exp fractional (double)
    val floatExpPayload = """{"role":"anon","ref":"project","exp":${fixedNow + 3600}.5}"""
    assertFalse(validateRuntime(validUrl, syntheticJwt(rawPayload = floatExpPayload)))
    // Exp expired (past)
    assertFalse(validateRuntime(validUrl, syntheticJwt(exp = fixedNow - 100)))
    // Exp equal to now
    assertFalse(validateRuntime(validUrl, syntheticJwt(exp = fixedNow)))
  }

  @Test
  fun headerAndPayloadStructuralIntegrityInRuntime() {
    // alg = none -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(alg = "none")))
    // alg missing -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(alg = null)))
    // alg RS256 -> rejected
    assertFalse(validateRuntime(validUrl, syntheticJwt(alg = "RS256")))
    // Corrupt header
    assertFalse(validateRuntime(validUrl, "not-base64.eyJyb2xlIjoiYW5vbiJ9.sig"))
    // Corrupt payload
    assertFalse(validateRuntime(validUrl, "eyJhbGciOiJIUzI1NiJ9.not-json.sig"))
    // Not 3 segments
    assertFalse(validateRuntime(validUrl, "single-part"))
    assertFalse(validateRuntime(validUrl, "part1.part2"))
    assertFalse(validateRuntime(validUrl, "part1.part2.part3.part4"))
    // Indecodable chars
    assertFalse(validateRuntime(validUrl, "part!1.part@2.part#3"))
  }

  @Test
  fun urlProhibitedComponentsInRuntime() {
    val validKey = syntheticJwt()
    // http rejected
    assertFalse(validateRuntime("http://project.supabase.co", validKey))
    // explicit port rejected
    assertFalse(validateRuntime("https://project.supabase.co:8443", validKey))
    // userinfo rejected
    assertFalse(validateRuntime("https://admin:pass@project.supabase.co", validKey))
    // query rejected
    assertFalse(validateRuntime("https://project.supabase.co?k=v", validKey))
    // fragment rejected
    assertFalse(validateRuntime("https://project.supabase.co#hash", validKey))
    // disallowed path rejected
    assertFalse(validateRuntime("https://project.supabase.co/api/v1", validKey))
    // valid path variations
    assertTrue(validateRuntime("https://project.supabase.co", validKey))
    assertTrue(validateRuntime("https://project.supabase.co/", validKey))
    // evil domains
    assertFalse(validateRuntime("https://project.supabase.co.evil.com", validKey))
  }
}
