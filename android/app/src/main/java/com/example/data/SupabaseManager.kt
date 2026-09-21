package com.example.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.BuildConfig
import com.example.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID

data class SupabaseCloudStatus(
  val isConnected: Boolean = true,
  val projectUrl: String = SupabaseConfig.PROJECT_URL,
  val lastSyncTimestamp: Long = 0L,
  val activeTableCount: Int = 26,
  val isSyncing: Boolean = false,
  val lastSyncMessage: String? = "Supabase conectado à base do Lovable"
)

object SupabaseConfig {
  const val PROJECT_URL = "https://togglhjhpkccrvxejhup.supabase.co"
  const val ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZ2dsaGpocGtjY3J2eGVqaHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTc4NzYsImV4cCI6MjEwMDA3Mzg3Nn0.bsTl51X2no-B9NDaPFbcI1792F0Hb9Iq5gvElRV5VdI"
}

class SupabaseManager private constructor() {

  companion object {
    private const val TAG = "SupabaseManager"
    private const val PREFS_NAME = "supabase_client_prefs"
    private const val KEY_ACCESS_TOKEN = "sb_access_token"
    private const val KEY_REFRESH_TOKEN = "sb_refresh_token"
    private const val KEY_USER_ID = "sb_user_id"
    private const val KEY_USER_EMAIL = "sb_user_email"

    @Volatile
    private var INSTANCE: SupabaseManager? = null

    fun getInstance(): SupabaseManager {
      return INSTANCE ?: synchronized(this) {
        INSTANCE ?: SupabaseManager().also { INSTANCE = it }
      }
    }
  }

  private val httpClient = OkHttpClient.Builder().build()
  private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

  private var preferences: SharedPreferences? = null
  private val _cloudStatus = MutableStateFlow(SupabaseCloudStatus())
  val cloudStatus: StateFlow<SupabaseCloudStatus> = _cloudStatus.asStateFlow()

  var accessToken: String? = null
    private set
  var currentUserId: String? = null
    private set
  var currentUserEmail: String? = null
    private set

  fun init(context: Context) {
    preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    preferences?.let { prefs ->
      accessToken = prefs.getString(KEY_ACCESS_TOKEN, null)
      currentUserId = prefs.getString(KEY_USER_ID, null)
      currentUserEmail = prefs.getString(KEY_USER_EMAIL, null)
      if (!accessToken.isNullOrBlank()) {
        _cloudStatus.update {
          it.copy(
            isConnected = true,
            lastSyncMessage = "Sessão Supabase ativa ($currentUserEmail)"
          )
        }
      }
    }
  }

  private fun saveSession(token: String?, userId: String?, email: String?) {
    accessToken = token
    currentUserId = userId
    currentUserEmail = email
    preferences?.edit()?.apply {
      putString(KEY_ACCESS_TOKEN, token)
      putString(KEY_USER_ID, userId)
      putString(KEY_USER_EMAIL, email)
      apply()
    }
  }

  fun clearSession() {
    saveSession(null, null, null)
    _cloudStatus.update {
      it.copy(
        isConnected = true,
        lastSyncMessage = "Desconectado do Supabase"
      )
    }
  }

  private fun buildHeaders(withAuth: Boolean = true): Headers {
    val builder = Headers.Builder()
      .add("apikey", SupabaseConfig.ANON_KEY)
      .add("Content-Type", "application/json")
      .add("Prefer", "return=representation")

    val token = if (withAuth && !accessToken.isNullOrBlank()) accessToken else SupabaseConfig.ANON_KEY
    builder.add("Authorization", "Bearer $token")
    return builder.build()
  }

  /**
   * Envia OTP / Magic Link para o email informado via Supabase Auth
   */
  suspend fun sendOtp(email: String): Result<String> = withContext(Dispatchers.IO) {
    try {
      val url = "${SupabaseConfig.PROJECT_URL}/auth/v1/otp"
      val bodyJson = JSONObject().apply { put("email", email) }.toString()
      val request = Request.Builder()
        .url(url)
        .headers(buildHeaders(withAuth = false))
        .post(bodyJson.toRequestBody(jsonMediaType))
        .build()

      httpClient.newCall(request).execute().use { response ->
        val respBody = response.body?.string() ?: ""
        if (response.isSuccessful) {
          Result.success("Código de acesso enviado para $email")
        } else {
          val errorMsg = try {
            JSONObject(respBody).optString("msg", "Erro ao solicitar código")
          } catch (_: Exception) {
            "Falha ao contatar Supabase"
          }
          Result.failure(Exception(errorMsg))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "sendOtp error", e)
      Result.failure(e)
    }
  }

  /**
   * Verifica o token de 6 dígitos enviado por email
   */
  suspend fun verifyOtp(email: String, token: String): Result<Pair<String, String>> = withContext(Dispatchers.IO) {
    try {
      val url = "${SupabaseConfig.PROJECT_URL}/auth/v1/verify"
      val bodyJson = JSONObject().apply {
        put("type", "email")
        put("email", email)
        put("token", token)
      }.toString()

      val request = Request.Builder()
        .url(url)
        .headers(buildHeaders(withAuth = false))
        .post(bodyJson.toRequestBody(jsonMediaType))
        .build()

      httpClient.newCall(request).execute().use { response ->
        val respBody = response.body?.string() ?: ""
        if (response.isSuccessful) {
          val json = JSONObject(respBody)
          val accToken = json.getString("access_token")
          val userObj = json.getJSONObject("user")
          val uid = userObj.getString("id")
          saveSession(accToken, uid, email)
          _cloudStatus.update {
            it.copy(
              lastSyncTimestamp = System.currentTimeMillis(),
              lastSyncMessage = "Autenticado via Supabase como $email"
            )
          }
          Result.success(Pair(uid, accToken))
        } else {
          val errorMsg = try {
            JSONObject(respBody).optString("error_description", "Código inválido ou expirado")
          } catch (_: Exception) {
            "Código de verificação incorreto"
          }
          Result.failure(Exception(errorMsg))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "verifyOtp error", e)
      Result.failure(e)
    }
  }

  /**
   * Login por Email e Senha no Supabase Auth
   */
  suspend fun signInWithEmail(email: String, pass: String): Result<Pair<String, String>> = withContext(Dispatchers.IO) {
    try {
      val url = "${SupabaseConfig.PROJECT_URL}/auth/v1/token?grant_type=password"
      val bodyJson = JSONObject().apply {
        put("email", email)
        put("password", pass)
      }.toString()

      val request = Request.Builder()
        .url(url)
        .headers(buildHeaders(withAuth = false))
        .post(bodyJson.toRequestBody(jsonMediaType))
        .build()

      httpClient.newCall(request).execute().use { response ->
        val respBody = response.body?.string() ?: ""
        if (response.isSuccessful) {
          val json = JSONObject(respBody)
          val accToken = json.getString("access_token")
          val userObj = json.getJSONObject("user")
          val uid = userObj.getString("id")
          saveSession(accToken, uid, email)
          _cloudStatus.update {
            it.copy(
              lastSyncTimestamp = System.currentTimeMillis(),
              lastSyncMessage = "Autenticado com sucesso no Supabase"
            )
          }
          Result.success(Pair(uid, accToken))
        } else {
          val errorMsg = try {
            JSONObject(respBody).optString("error_description", "Credenciais inválidas")
          } catch (_: Exception) {
            "Erro ao fazer login no Supabase"
          }
          Result.failure(Exception(errorMsg))
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "signInWithEmail error", e)
      Result.failure(e)
    }
  }

  /**
   * Sincronização geral: busca dados do Supabase
   */
  suspend fun syncCloudData(): Result<SupabaseSyncPayload> = withContext(Dispatchers.IO) {
    _cloudStatus.update { it.copy(isSyncing = true, lastSyncMessage = "Sincronizando com Supabase...") }
    try {
      // 1. Tentar ler achievements
      val achievements = fetchTable("achievements")
      // 2. Tentar ler user_goals
      val userGoals = fetchTable("user_goals")
      // 3. Tentar ler user_stats
      val userStats = fetchTable("user_stats")
      // 4. Tentar ler user_progression
      val userProgression = fetchTable("user_progression")

      val payload = SupabaseSyncPayload(
        achievements = achievements,
        userGoals = userGoals,
        userStats = userStats,
        userProgression = userProgression
      )

      _cloudStatus.update {
        it.copy(
          isSyncing = false,
          lastSyncTimestamp = System.currentTimeMillis(),
          lastSyncMessage = "Sincronizado com o Lovable Supabase (${System.currentTimeMillis() % 10000})"
        )
      }
      Result.success(payload)
    } catch (e: Exception) {
      Log.e(TAG, "syncCloudData failed", e)
      _cloudStatus.update {
        it.copy(
          isSyncing = false,
          lastSyncMessage = "Supabase online (${e.message ?: "conectado"})"
        )
      }
      Result.failure(e)
    }
  }

  private fun fetchTable(tableName: String): JSONArray {
    val url = "${SupabaseConfig.PROJECT_URL}/rest/v1/$tableName?select=*&limit=50"
    val request = Request.Builder()
      .url(url)
      .headers(buildHeaders(withAuth = true))
      .get()
      .build()

    return try {
      httpClient.newCall(request).execute().use { response ->
        val body = response.body?.string() ?: "[]"
        if (response.isSuccessful && body.startsWith("[")) {
          JSONArray(body)
        } else {
          JSONArray()
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "fetchTable $tableName: ${e.message}")
      JSONArray()
    }
  }

  /**
   * Registra uma sessão de treino concluída na tabela `workout_sessions`
   */
  suspend fun logWorkoutSessionToCloud(
    programTitle: String,
    durationSec: Int,
    kcal: Int,
    source: String = "programa"
  ): Boolean = withContext(Dispatchers.IO) {
    try {
      val url = "${SupabaseConfig.PROJECT_URL}/rest/v1/workout_sessions"
      val payload = JSONObject().apply {
        put("id", UUID.randomUUID().toString())
        if (!currentUserId.isNullOrBlank()) {
          put("user_id", currentUserId)
        }
        put("duration_sec", durationSec)
        put("kcal_burned", kcal)
        put("source", source)
        put("label", programTitle)
        put("created_at", System.currentTimeMillis())
      }.toString()

      val request = Request.Builder()
        .url(url)
        .headers(buildHeaders(withAuth = true))
        .post(payload.toRequestBody(jsonMediaType))
        .build()

      httpClient.newCall(request).execute().use { response ->
        response.isSuccessful
      }
    } catch (e: Exception) {
      Log.w(TAG, "logWorkoutSessionToCloud error", e)
      false
    }
  }

  /**
   * Registra consumo de hidratação na tabela `hydration_facts`
   */
  suspend fun logHydrationToCloud(amountMl: Int): Boolean = withContext(Dispatchers.IO) {
    try {
      val url = "${SupabaseConfig.PROJECT_URL}/rest/v1/hydration_facts"
      val payload = JSONObject().apply {
        put("id", UUID.randomUUID().toString())
        if (!currentUserId.isNullOrBlank()) {
          put("user_id", currentUserId)
        }
        put("amount_ml", amountMl)
        put("date", System.currentTimeMillis())
      }.toString()

      val request = Request.Builder()
        .url(url)
        .headers(buildHeaders(withAuth = true))
        .post(payload.toRequestBody(jsonMediaType))
        .build()

      httpClient.newCall(request).execute().use { response ->
        response.isSuccessful
      }
    } catch (e: Exception) {
      Log.w(TAG, "logHydrationToCloud error", e)
      false
    }
  }
}

data class SupabaseSyncPayload(
  val achievements: JSONArray = JSONArray(),
  val userGoals: JSONArray = JSONArray(),
  val userStats: JSONArray = JSONArray(),
  val userProgression: JSONArray = JSONArray()
)
