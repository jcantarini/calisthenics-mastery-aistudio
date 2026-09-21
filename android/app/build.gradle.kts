
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
    buildConfigField("String", "SUPABASE_URL", literal(publicValue("ANDROID_SUPABASE_URL")))
    val publicKey = publicValue("ANDROID_SUPABASE_PUBLISHABLE_KEY")
    require(publicKey.isEmpty() || publicKey.matches(Regex("sb_publishable_[A-Za-z0-9_-]{16,}"))) {
      "ANDROID_SUPABASE_PUBLISHABLE_KEY must be a public publishable key; secret and legacy JWT keys are forbidden"
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
    // AI Studio may explicitly supply its debug keystore. Local/CI use Android's default.
    val studioDebugPath = System.getenv("AI_STUDIO_DEBUG_KEYSTORE")
    if (!studioDebugPath.isNullOrBlank()) {
      getByName("debug") {
        storeFile = file(studioDebugPath)
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
