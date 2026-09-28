package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.auth.*
import java.io.File
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class SessionVaultTest {
  private val context: Context = ApplicationProvider.getApplicationContext()
  private class Keys : VaultKeySource {
    var value:SecretKey=KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    override fun key()=value
    override fun destroy() { value=KeyGenerator.getInstance("AES").apply { init(256) }.generateKey() }
  }
  @Test fun encryptedRoundTripNeverWritesPlainTokenAndClearDestroysIt() {
    val keys=Keys();val vault=KeystoreSessionVault(context,"https://project.supabase.co",keys);vault.clear()
    vault.write("refresh-sensitive-token")
    val bytes=File(context.noBackupFilesDir,"auth-refresh-v1.bin").readBytes()
    assertFalse(bytes.toString(Charsets.UTF_8).contains("refresh-sensitive-token"))
    assertEquals("refresh-sensitive-token",KeystoreSessionVault(context,"https://project.supabase.co",keys).read())
    vault.clear();assertNull(vault.read())
  }
  @Test fun tamperAndKeyLossFailClosedAndDiscardCiphertext() {
    val keys=Keys();val vault=KeystoreSessionVault(context,"https://project.supabase.co",keys);vault.clear();vault.write("refresh")
    val file=File(context.noBackupFilesDir,"auth-refresh-v1.bin");val bytes=file.readBytes();bytes[bytes.lastIndex]=(bytes.last().toInt() xor 1).toByte();file.writeBytes(bytes)
    try { vault.read();fail("tamper accepted") } catch (_:IllegalStateException) {}
    assertNull(vault.read());vault.write("refresh");keys.destroy()
    try { vault.read();fail("lost key accepted") } catch (_:IllegalStateException) {}
    assertNull(vault.read())
  }
  @Test fun encryptedTokenCannotBeReusedForDifferentProject() {
    val keys=Keys();val vault=KeystoreSessionVault(context,"https://one.supabase.co",keys);vault.clear();vault.write("refresh")
    try { KeystoreSessionVault(context,"https://two.supabase.co",keys).read();fail("cross-project accepted") } catch (_:IllegalStateException) {}
  }
  @Test fun keyDeletionFailureStillRemovesSavedToken() {
    val keys=Keys()
    val vault=KeystoreSessionVault(context,"https://project.supabase.co",keys)
    vault.clear();vault.write("refresh-sensitive-token")
    val failingKeys=object:VaultKeySource {
      override fun key()=keys.key()
      override fun destroy() { error("Keystore unavailable") }
    }
    val failingVault=KeystoreSessionVault(context,"https://project.supabase.co",failingKeys)
    try { failingVault.clear();fail("storage error hidden") } catch (_:IllegalStateException) {}
    assertNull(vault.read())
  }
}
