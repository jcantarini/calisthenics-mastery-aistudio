package com.example.auth

import androidx.credentials.exceptions.GetCredentialException
import com.example.BuildConfig
import io.github.jan.supabase.auth.exception.AuthRestException
import io.github.jan.supabase.exceptions.HttpRequestException
import io.github.jan.supabase.exceptions.RestException
import io.ktor.client.plugins.ResponseException

object AuthDiagnostics {

  val KNOWN_PROVIDER_CODES = setOf(
    "invalid_grant",
    "invalid_request",
    "unauthorized_client",
    "provider_disabled",
    "user_not_found",
    "bad_jwt",
    "over_email_send_rate_limit",
    "flow_state_not_found",
    "signup_disabled",
    "user_already_exists",
    "weak_password",
    "email_not_confirmed",
    "phone_not_confirmed",
    "session_not_found",
    "refresh_token_not_found",
    "refresh_token_already_used",
    "validation_failed",
    "conflict",
    "invalid_credentials",
    "bad_oauth_state",
    "bad_oauth_callback",
    "oauth_provider_not_supported",
    "AUTH_REJECTED",
    "LOGIN_CANCELLED",
    "TIMEOUT",
    "ERASE_FAILED",
    "CONFIG_INCOMPLETE",
    "SECURE_STORAGE_ERROR",
    "GET_CREDENTIAL_UNSUPPORTED",
    "GET_CREDENTIAL_CONFIGURATION_ERROR",
    "GET_CREDENTIAL_UNKNOWN",
    "NO_CREDENTIAL",
    "NETWORK_ERROR"
  )

  fun sanitize(
    stage: AuthStage,
    error: Throwable,
    isDebug: Boolean = BuildConfig.DEBUG
  ): AuthDiagnostic? {
    if (!isDebug) return null

    val unwrapped = if (error is AuthDiagnosticException) error.cause else error
    val exClass = unwrapped.javaClass.simpleName.ifBlank { unwrapped.javaClass.name }

    var httpStatus: Int? = null
    var providerErrorCode: String? = null

    when (unwrapped) {
      is AuthRestException -> {
        httpStatus = try { unwrapped.statusCode } catch (_: Throwable) { null }
        val codeValue = try {
          val v = unwrapped.errorCode?.value?.trim()?.lowercase()
          if (v != null && v != "unknown" && v.isNotBlank()) v else null
        } catch (_: Throwable) { null }
        val rawError = try { unwrapped.error.trim().lowercase() } catch (_: Throwable) { null }
        val candidate = codeValue ?: rawError

        if (candidate != null && KNOWN_PROVIDER_CODES.contains(candidate)) {
          providerErrorCode = candidate
        } else if (!candidate.isNullOrBlank()) {
          providerErrorCode = "UNKNOWN"
        }
      }
      is RestException -> {
        httpStatus = try { unwrapped.statusCode } catch (_: Throwable) { null }
        val rawError = try { unwrapped.error.trim().lowercase() } catch (_: Throwable) { null }
        if (rawError != null && KNOWN_PROVIDER_CODES.contains(rawError)) {
          providerErrorCode = rawError
        } else if (!rawError.isNullOrBlank()) {
          providerErrorCode = "UNKNOWN"
        }
      }
      is ResponseException -> {
        httpStatus = unwrapped.response.status.value
      }
      is HttpRequestException -> {
        val cause = unwrapped.cause
        if (cause is ResponseException) {
          httpStatus = cause.response.status.value
        } else {
          providerErrorCode = "NETWORK_ERROR"
        }
      }
      is GetCredentialException -> {
        providerErrorCode = when (unwrapped) {
          is androidx.credentials.exceptions.GetCredentialUnsupportedException -> "GET_CREDENTIAL_UNSUPPORTED"
          is androidx.credentials.exceptions.GetCredentialProviderConfigurationException -> "GET_CREDENTIAL_CONFIGURATION_ERROR"
          is androidx.credentials.exceptions.GetCredentialUnknownException -> "GET_CREDENTIAL_UNKNOWN"
          is androidx.credentials.exceptions.NoCredentialException -> "NO_CREDENTIAL"
          else -> "UNKNOWN"
        }
      }
      is AuthRejected -> {
        providerErrorCode = "AUTH_REJECTED"
      }
      is LoginCancelled -> {
        providerErrorCode = "LOGIN_CANCELLED"
      }
      is java.net.UnknownHostException,
      is java.net.ConnectException,
      is java.net.SocketTimeoutException,
      is io.ktor.client.network.sockets.ConnectTimeoutException,
      is io.ktor.client.network.sockets.SocketTimeoutException -> {
        providerErrorCode = "NETWORK_ERROR"
      }
      is IllegalStateException -> {
        if (unwrapped.message == "Secure session unavailable" || unwrapped.message == "disk failure") {
          providerErrorCode = "SECURE_STORAGE_ERROR"
        } else {
          providerErrorCode = "UNKNOWN"
        }
      }
      else -> {
        providerErrorCode = null
      }
    }

    return AuthDiagnostic(
      stage = stage,
      exceptionClass = exClass,
      httpStatus = httpStatus,
      providerErrorCode = providerErrorCode
    )
  }
}
