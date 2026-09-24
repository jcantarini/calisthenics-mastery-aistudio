package com.example.auth

import java.net.URI

/** Only public publishable keys are supported; privileged/legacy JWT keys fail closed. */
data class AuthConfiguration(val supabaseUrl: String, val publishableKey: String, val googleWebClientId: String) {
  val isValid: Boolean get() = try {
    val uri = URI(supabaseUrl)
    uri.scheme == "https" && uri.host?.matches(Regex("[a-z0-9]+\\.supabase\\.co")) == true &&
      uri.userInfo == null && uri.port == -1 && uri.query == null && uri.fragment == null &&
      (uri.path.isNullOrEmpty() || uri.path == "/") &&
      publishableKey.matches(Regex("sb_publishable_[A-Za-z0-9_-]{16,}")) &&
      googleWebClientId.matches(Regex("[0-9]+-[A-Za-z0-9_-]+\\.apps\\.googleusercontent\\.com"))
  } catch (_: Exception) { false }
}
