package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.auth.KeystoreSessionVault
import java.io.File
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class KeystoreDeviceTest {
  @Test fun realAndroidKeystoreSurvivesStoreRecreationAndRejectsTampering() {
    val context=ApplicationProvider.getApplicationContext<Context>()
    val vault=KeystoreSessionVault(context,"https://device-test.supabase.co")
    try {
      vault.clear();vault.write("instrumentation-only-refresh")
      assertEquals("instrumentation-only-refresh",KeystoreSessionVault(context,"https://device-test.supabase.co").read())
      val f=File(context.noBackupFilesDir,"auth-refresh-v1.bin");val b=f.readBytes()
      assertFalse(b.toString(Charsets.UTF_8).contains("instrumentation-only-refresh"))
      b[b.lastIndex]=(b.last().toInt() xor 1).toByte();f.writeBytes(b)
      try { vault.read();fail("tampered ciphertext accepted") } catch (_:IllegalStateException) {}
      assertNull(vault.read())
    } finally { vault.clear() }
  }
}
