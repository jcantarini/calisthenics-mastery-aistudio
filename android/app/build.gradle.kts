
import java.util.Base64
import java.net.URI

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
}

android {
  namespace = "com.example"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.aistudio.calisthenicsmastery.app"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"

    // Only these PUBLIC values enter the APK; no .env or arbitrary secret injection.
    fun publicValue(name: String): String = providers.gradleProperty(name).orElse(providers.environmentVariable(name)).getOrElse("")
    fun literal(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "").replace("\r", "") + "\""
    val supabaseUrl = publicValue("ANDROID_SUPABASE_URL")
    buildConfigField("String", "SUPABASE_URL", literal(supabaseUrl))
    val publicKey = publicValue("ANDROID_SUPABASE_PUBLISHABLE_KEY")
    if (publicKey.isNotEmpty()) {
      val isUrlValid = try {
        val uri = URI(supabaseUrl)
        uri.scheme == "https" &&
          uri.host?.matches(Regex("[a-z0-9]+\\.supabase\\.co")) == true &&
          uri.userInfo == null && uri.port == -1 && uri.query == null && uri.fragment == null &&
          (uri.path.isNullOrEmpty() || uri.path == "/")
      } catch (_: Exception) { false }

      val isPublishable = isUrlValid && publicKey.matches(Regex("sb_publishable_[A-Za-z0-9_-]{16,}"))
      val isLegacyAnon = if (isUrlValid && !isPublishable && !publicKey.startsWith("sb_secret_")) {
        try {
          val parts = publicKey.split('.')
          if (parts.size == 3 && parts.all { it.isNotEmpty() && it.matches(Regex("^[A-Za-z0-9_-]+$")) }) {
            fun pad(s: String) = if (s.length % 4 > 0) s + "=".repeat(4 - (s.length % 4)) else s

            val headerBytes = Base64.getUrlDecoder().decode(pad(parts[0]))
            val headerJson = groovy.json.JsonSlurper().parseText(String(headerBytes, Charsets.UTF_8)) as? Map<*, *>
            val alg = headerJson?.get("alg")

            val payloadBytes = Base64.getUrlDecoder().decode(pad(parts[1]))
            val parsed = groovy.json.JsonSlurper().parseText(String(payloadBytes, Charsets.UTF_8)) as? Map<*, *>

            val sigBytes = Base64.getUrlDecoder().decode(pad(parts[2]))

            val role = parsed?.get("role")
            val ref = parsed?.get("ref")
            val hasSub = parsed != null && parsed.containsKey("sub") && parsed["sub"] != null
            val rawExp = parsed?.get("exp")

            val expectedRef = try {
              val uri = URI(supabaseUrl)
              uri.host?.substringBefore(".supabase.co")
            } catch (_: Exception) { null }

            val expLong = when (rawExp) {
              is Long -> rawExp
              is Int -> rawExp.toLong()
              else -> null
            }
            val nowSec = System.currentTimeMillis() / 1000

            alg is String && alg == "HS256" && alg != "none" &&
              role is String && role == "anon" &&
              !hasSub &&
              ref is String && expectedRef != null && ref == expectedRef &&
              expLong != null && expLong > nowSec &&
              sigBytes.isNotEmpty()
          } else false
        } catch (_: Exception) { false }
      } else false
      require(isPublishable || isLegacyAnon) {
        "ANDROID_SUPABASE_PUBLISHABLE_KEY and ANDROID_SUPABASE_URL configuration validation failed: must be a valid publishable key (sb_publishable_*) or legacy anon JWT matching a valid Supabase HTTPS URL; secret, service_role, and mismatched keys are forbidden"
      }
    }
    buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", literal(publicKey))
    buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", literal(publicValue("ANDROID_GOOGLE_WEB_CLIENT_ID")))

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }

  signingConfigs {
    create("release") {
      val keystorePath = System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
      storeFile = file(keystorePath)
      storePassword = System.getenv("STORE_PASSWORD")
      keyAlias = "upload"
      keyPassword = System.getenv("KEY_PASSWORD")
    }
    // Explicitly use the development keystore when AI_STUDIO_DEBUG_KEYSTORE is defined.
    val studioKeystore = System.getenv("AI_STUDIO_DEBUG_KEYSTORE")
    if (!studioKeystore.isNullOrBlank()) {
      getByName("debug") {
        storeFile = file(studioKeystore)
        storePassword = "android"
        keyAlias = "androiddebugkey"
        keyPassword = "android"
      }
    }
  }

  buildTypes {
    release {
      isCrunchPngs = false
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      signingConfig = signingConfigs.getByName("release")
    }
    debug { signingConfig = signingConfigs.getByName("debug") }
  }
  compileOptions {
    isCoreLibraryDesugaringEnabled = true
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    compose = true
    buildConfig = true
  }
  testOptions { unitTests { isIncludeAndroidResources = true } }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

dependencies {
  implementation("io.github.jan-tennert.supabase:auth-kt:3.2.2")
  implementation("io.ktor:ktor-client-okhttp:3.2.2")
  implementation(libs.androidx.credentials)
  implementation(libs.androidx.credentials.play.services)
  implementation(libs.googleid)
  coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
  implementation(platform(libs.androidx.compose.bom))
  implementation(libs.androidx.activity.compose)
  implementation(libs.androidx.compose.material.icons.core)
  implementation(libs.androidx.compose.material.icons.extended)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.graphics)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.lifecycle.viewmodel.compose)
  implementation(libs.androidx.navigation.compose)

  implementation(libs.kotlinx.coroutines.android)
  implementation(libs.kotlinx.coroutines.core)
  testImplementation(libs.androidx.compose.ui.test.junit4)
  testImplementation(libs.androidx.core)
  testImplementation(libs.androidx.junit)
  testImplementation(libs.junit)
  testImplementation("io.ktor:ktor-client-mock:3.2.2")
  testImplementation(libs.kotlinx.coroutines.test)
  testImplementation(libs.robolectric)
  androidTestImplementation(platform(libs.androidx.compose.bom))
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  androidTestImplementation(libs.androidx.espresso.core)
  androidTestImplementation(libs.androidx.junit)
  androidTestImplementation(libs.androidx.runner)
  debugImplementation(libs.androidx.compose.ui.test.manifest)
  debugImplementation(libs.androidx.compose.ui.tooling)
}

// Lock the application and test dependency graphs, including the Supabase/Ktor transitives.
configurations.configureEach {
  if (name.endsWith("CompileClasspath") || name.endsWith("RuntimeClasspath")) {
    resolutionStrategy.activateDependencyLocking()
  }
}
