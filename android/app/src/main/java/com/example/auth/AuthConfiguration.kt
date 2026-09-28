package com.example.auth

import java.net.URI
import java.util.Base64
import org.json.JSONObject

/**
 * Public client authentication configuration.
 * Accepts modern Supabase publishable keys (sb_publishable_*) or legacy anon JWT keys
 * matching the configured Supabase host. Secret keys (sb_secret_*), service_role keys,
 * user tokens, and expired or mismatched tokens fail closed.
 * Note: Local classification only; actual authentication and token verification is performed by the backend.
 */
data class AuthConfiguration(
  val supabaseUrl: String,
  val publishableKey: String,
  val googleWebClientId: String,
  val nowEpochSeconds: Long? = null
) {
  val isValid: Boolean get() = try {
    val uri = URI(supabaseUrl)
    val host = uri.host
    val isHostValid = uri.scheme == "https" &&
      host != null && host.matches(Regex("[a-z0-9]+\\.supabase\\.co")) &&
      uri.userInfo == null && uri.port == -1 && uri.query == null && uri.fragment == null &&
      (uri.path.isNullOrEmpty() || uri.path == "/")

    val isClientIdValid = googleWebClientId.matches(Regex("[0-9]+-[A-Za-z0-9_-]+\\.apps\\.googleusercontent\\.com"))

    isHostValid && isClientIdValid && isKeyValid(host!!.substringBefore(".supabase.co"))
  } catch (_: Exception) { false }

  private fun isKeyValid(expectedProjectRef: String): Boolean {
    if (publishableKey.startsWith("sb_secret_")) return false
    if (publishableKey.matches(Regex("sb_publishable_[A-Za-z0-9_-]{16,}"))) return true

    return isLegacyAnonJwt(publishableKey, expectedProjectRef)
  }

  private fun isLegacyAnonJwt(key: String, expectedProjectRef: String): Boolean {
    return try {
      val parts = key.split('.')
      if (parts.size != 3) return false
      val base64UrlRegex = Regex("^[A-Za-z0-9_-]+$")
      if (!parts.all { it.isNotEmpty() && it.matches(base64UrlRegex) }) return false

      fun pad(s: String) = if (s.length % 4 > 0) s + "=".repeat(4 - (s.length % 4)) else s

      // 1. Header validation
      val headerBytes = Base64.getUrlDecoder().decode(pad(parts[0]))
      val headerJson = JSONObject(String(headerBytes, Charsets.UTF_8))
      val alg = headerJson.opt("alg")
      if (alg !is String || alg != "HS256" || alg == "none") return false

      // 2. Payload validation
      val payloadBytes = Base64.getUrlDecoder().decode(pad(parts[1]))
      val json = JSONObject(String(payloadBytes, Charsets.UTF_8))

      val role = json.opt("role")
      if (role !is String || role != "anon") return false

      val ref = json.opt("ref")
      if (ref !is String || ref != expectedProjectRef) return false

      // sub: only absent or JSON null; reject "" and whitespace
      if (json.has("sub") && !json.isNull("sub")) return false

      // exp: integer number, in the future; reject strings, fractions, out of range
      val rawExp = json.opt("exp")
      val expLong = when (rawExp) {
        is Long -> rawExp
        is Int -> rawExp.toLong()
        else -> return false
      }
      val currentSec = nowEpochSeconds ?: (System.currentTimeMillis() / 1000)
      if (expLong <= currentSec) return false

      // 3. Signature segment validation (must be valid Base64URL decodable)
      val sigBytes = Base64.getUrlDecoder().decode(pad(parts[2]))
      sigBytes.isNotEmpty()
    } catch (_: Exception) {
      false
    }
  }
}
