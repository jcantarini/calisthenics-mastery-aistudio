package com.example.auth

import android.app.Activity
import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Only the real OS credential provider can supply an ID token. No editable email fallback. */
class GoogleCredentialProvider(context: Context, private val clientId: String) {
  private val manager = CredentialManager.create(context.applicationContext)
  private val mutex = Mutex()
  suspend fun obtain(activity: Activity, hashedNonce: String): String = mutex.withLock {
    try {
      val option = GetSignInWithGoogleOption.Builder(clientId).setNonce(hashedNonce).build()
      val result = manager.getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(option).build())
      val credential = result.credential
      if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) throw AuthRejected()
      GoogleIdTokenCredential.createFrom(credential.data).idToken
    } catch (_: GetCredentialCancellationException) { throw LoginCancelled() }
  }
  suspend fun clear() = mutex.withLock { manager.clearCredentialState(ClearCredentialStateRequest()) }
}
