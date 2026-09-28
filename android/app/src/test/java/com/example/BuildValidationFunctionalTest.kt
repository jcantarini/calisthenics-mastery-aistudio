package com.example

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.Base64

/**
 * Functional verification executing Gradle directly with synthetic properties
 * to test the real configuration validation implemented in app/build.gradle.kts.
 */
class BuildValidationFunctionalTest {

  private val validUrl = "https://project.supabase.co"
  private val expectedErrorMessage = "ANDROID_SUPABASE_PUBLISHABLE_KEY and ANDROID_SUPABASE_URL configuration validation failed"

  private fun findRootDir(): File {
    var dir = File(System.getProperty("user.dir") ?: ".")
    while (!File(dir, "settings.gradle.kts").exists() && dir.parentFile != null) {
      dir = dir.parentFile ?: break
    }
    return dir
  }

  private fun runGradle(props: Map<String, String>): Pair<Int, String> {
    val root = findRootDir()
    val cmd = mutableListOf("gradle")
    props.forEach { (k, v) -> cmd.add("-P$k=$v") }
    cmd.add(":app:help")
    cmd.add("--quiet")

    val pb = ProcessBuilder(cmd)
    pb.directory(root)
    pb.redirectErrorStream(true)
    val process = pb.start()
    val output = process.inputStream.bufferedReader().readText()
    val exitCode = process.waitFor()
    return Pair(exitCode, output)
  }

  private fun syntheticJwt(
    alg: String? = "HS256",
    role: Any? = "anon",
    ref: Any? = "project",
    exp: Any? = (System.currentTimeMillis() / 1000) + 3600,
    sub: Any? = null,
    includeSub: Boolean = false,
    signature: String = "synthetic-sig"
  ): String {
    val encoder = Base64.getUrlEncoder().withoutPadding()
    val headerString = """{"alg":"$alg","typ":"JWT"}"""
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
    val payloadString = "{" + fields.joinToString(",") + "}"

    val h = encoder.encodeToString(headerString.toByteArray(Charsets.UTF_8))
    val p = encoder.encodeToString(payloadString.toByteArray(Charsets.UTF_8))
    val s = if (signature == "A") "A" else encoder.encodeToString(signature.toByteArray(Charsets.UTF_8))
    return "$h.$p.$s"
  }

  @Test
  fun test1_validPublishableKeyAccepted() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to "sb_publishable_1234567890123456"
      )
    )
    assertEquals("Valid publishable key must be accepted with exit code 0; output: $output", 0, exitCode)
  }

  @Test
  fun test2_validAnonJwtAccepted() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt()
      )
    )
    assertEquals("Valid anon JWT must be accepted with exit code 0; output: $output", 0, exitCode)
  }

  @Test
  fun test3_serviceRoleKeyRejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt(role = "service_role")
      )
    )
    assertNotEquals("Service role JWT must be rejected with non-zero exit code", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test4_otherProjectRefRejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt(ref = "other-project")
      )
    )
    assertNotEquals("Anon JWT for different project must be rejected with non-zero exit code", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test5_emptySubRejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt(sub = "", includeSub = true)
      )
    )
    assertNotEquals("Anon JWT with empty string sub must be rejected with non-zero exit code", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test6_textualExpRejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt(exp = "9999999999")
      )
    )
    assertNotEquals("Anon JWT with string exp must be rejected with non-zero exit code", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test7_signatureARejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to validUrl,
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to syntheticJwt(signature = "A")
      )
    )
    assertNotEquals("Anon JWT with signature 'A' must be rejected due to Base64URL decode failure", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test8_publishableWithInvalidUrlRejected() {
    val (exitCode, output) = runGradle(
      mapOf(
        "ANDROID_SUPABASE_URL" to "http://project.supabase.co",
        "ANDROID_SUPABASE_PUBLISHABLE_KEY" to "sb_publishable_1234567890123456"
      )
    )
    assertNotEquals("Publishable key with HTTP URL must be rejected with non-zero exit code", 0, exitCode)
    assertTrue("Failure must come from configuration validation; output: $output", output.contains(expectedErrorMessage))
  }

  @Test
  fun test9_totallyAbsentConfigAllowsGuestMode() {
    val (exitCode, output) = runGradle(emptyMap())
    assertEquals("Totally absent configuration must allow guest mode build with exit code 0; output: $output", 0, exitCode)
  }
}
