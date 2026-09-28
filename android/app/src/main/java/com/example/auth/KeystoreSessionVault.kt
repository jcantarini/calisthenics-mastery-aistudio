package com.example.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

interface VaultKeySource { fun key(): SecretKey; fun destroy() }
class AndroidVaultKeySource : VaultKeySource {
  private val alias = "calisthenics.auth.refresh.v1"
  private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  override fun key(): SecretKey {
    (store().getKey(alias, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true).setKeySize(256).build())
    }.generateKey()
  }
  override fun destroy() { store().deleteEntry(alias) }
}

/** Only the refresh token is persisted. No-backup storage + non-exportable Keystore AES-GCM key. */
class KeystoreSessionVault(context: Context, projectUrl: String,
  private val keys: VaultKeySource = AndroidVaultKeySource()) : SessionVault {
  private val file = AtomicFile(File(context.noBackupFilesDir, "auth-refresh-v1.bin"))
  private val aad = "${context.packageName}|$projectUrl|refresh-v1".toByteArray(Charsets.UTF_8)
  @Synchronized override fun read(): String? {
    if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return null
    try {
      val bytes = file.readFully()
      require(bytes.size in 30..32768 && bytes[0] == 1.toByte())
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, keys.key(), GCMParameterSpec(128, bytes.copyOfRange(1, 13)))
      cipher.updateAAD(aad)
      return cipher.doFinal(bytes.copyOfRange(13, bytes.size)).toString(Charsets.UTF_8).also { require(it.isNotBlank()) }
    } catch (e: Exception) { clear(); throw IllegalStateException("Secure session unavailable") }
  }
  @Synchronized override fun write(refreshToken: String) {
    require(refreshToken.isNotBlank() && refreshToken.length < 16000)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, keys.key())
    cipher.updateAAD(aad)
    check(cipher.iv.size == 12)
    val bytes = byteArrayOf(1) + cipher.iv + cipher.doFinal(refreshToken.toByteArray(Charsets.UTF_8))
    val output = file.startWrite()
    try { output.write(bytes); file.finishWrite(output) }
    catch (e: Exception) { file.failWrite(output); throw IllegalStateException("Secure session unavailable") }
  }
  @Synchronized override fun clear() {
    // Attempt both removals even if Android Keystore is temporarily unavailable.
    try { keys.destroy() } finally {
      file.delete()
      check(!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists() &&
        !File(file.baseFile.path + ".new").exists()) { "Secure session removal failed" }
    }
  }
}
