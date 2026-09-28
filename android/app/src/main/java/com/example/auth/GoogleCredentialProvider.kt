package com.example.auth

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Only the real OS credential provider can supply an ID token. No editable email fallback. */
class GoogleCredentialProvider(context: Context, private val clientId: String) {
  private val manager = CredentialManager.create(context.applicationContext)
  private val mutex = Mutex()

  suspend fun obtain(activity: Activity, hashedNonce: String): String = mutex.withLock {
    val result = try {
      val option = GetSignInWithGoogleOption.Builder(clientId).setNonce(hashedNonce).build()
      manager.getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(option).build())
    } catch (_: GetCredentialCancellationException) {
      throw LoginCancelled()
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      throw AuthDiagnosticException(AuthStage.OBTENCAO_CREDENCIAL_GOOGLE, e)
    }

    try {
      val credential = result.credential
      if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        throw AuthRejected()
      }
      val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
      if (idToken.isBlank()) throw AuthRejected()
      idToken
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      throw AuthDiagnosticException(AuthStage.EXTRACAO_ID_TOKEN, e)
    }
  }

  suspend fun clear() = mutex.withLock {
    try {
      manager.clearCredentialState(ClearCredentialStateRequest())
    } catch (e: CancellationException) {
      throw e
    } catch (_: Exception) {}
  }
}
