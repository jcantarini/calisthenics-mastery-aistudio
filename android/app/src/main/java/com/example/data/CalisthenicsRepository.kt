package com.example.data

import android.content.Context
import com.example.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/** A local display name is never a verified cloud identity. */
data class GuestUser(val displayName: String)

data class CalisthenicsAppState(
  val currentUser: GuestUser? = null,
  val isSplashFinished: Boolean = false,
  val isAuthLoading: Boolean = false,
  val authErrorMessage: String? = null,
  val profile: UserProfile = UserProfile(),
  val activeProgram: Program = CalisthenicsData.PROGRAMS.first(),
  val goals: List<Goal> = emptyList(),
  val achievements: List<Achievement> = CalisthenicsData.DEFAULT_ACHIEVEMENTS.map { it.copy(isUnlocked = false) },
  val recentSessions: List<WorkoutSession> = emptyList(),
  val currentXp: Int = 0,
  val currentLevel: Int = 1,
  val streakDays: Int = 0,
  val totalWorkoutsCount: Int = 0,
  val totalMinutesTrained: Int = 0,
  val totalCaloriesBurned: Int = 0,
  val waterConsumedMl: Int = 0,
  val waterTargetMl: Int = 2500,
  val profileConfigured: Boolean = false,
  val notice: String? = null,
  val lastRewardedGoal: Goal? = null
)

class CalisthenicsRepository {
  private val _state = MutableStateFlow(CalisthenicsAppState())
  val state: StateFlow<CalisthenicsAppState> = _state.asStateFlow()

  fun initPreferences(context: Context) {
    // Prototype identities were not authenticated. Never restore them as sessions.
    context.getSharedPreferences("calisthenics_auth_prefs", Context.MODE_PRIVATE).edit().clear().apply()
    context.getSharedPreferences("supabase_client_prefs", Context.MODE_PRIVATE).edit().clear().apply()
  }

  fun enterGuest(name: String) {
    val displayName = name.trim().take(80).ifBlank { "Atleta" }
    _state.value = CalisthenicsAppState(
      currentUser = GuestUser(displayName), isSplashFinished = true,
      profile = UserProfile(name = displayName)
    )
  }

  fun requestGoogleSignIn() {
    // A2 owns the verified provider flow. There is no success fallback in A1.
    _state.value = CalisthenicsAppState(
      isSplashFinished = true,
      authErrorMessage = "Login Google indisponível nesta versão. Você pode explorar como convidado."
    )
  }

  fun finishSplash() { _state.update { it.copy(isSplashFinished = true) } }
  fun signOut() { _state.value = CalisthenicsAppState(isSplashFinished = true) }
  fun dismissNotice() { _state.update { it.copy(notice = null) } }
  fun persistenceUnavailable() {
    _state.update { it.copy(notice = "Histórico e recompensas indisponíveis. Esta atividade não foi salva.") }
  }
  fun setActiveProgram(programId: String) {
    val found = CalisthenicsData.PROGRAMS.find { it.id == programId } ?: return
    _state.update { it.copy(activeProgram = found) }
  }
  fun updateGoalProgress(goalId: String, delta: Int) {
    _state.update { curr ->
      curr.copy(goals = curr.goals.map { goal ->
        if (goal.id == goalId) goal.copy(current = (goal.current + delta).coerceAtLeast(0)) else goal
      })
    }
  }
  fun claimGoalReward(@Suppress("UNUSED_PARAMETER") goalId: String) { persistenceUnavailable() }
  fun dismissGoalReward() { _state.update { it.copy(lastRewardedGoal = null) } }

  fun addNewGoal(title: String, target: Int, unit: String, category: GoalCategory, deadline: String, @Suppress("UNUSED_PARAMETER") xpReward: Int) {
    require(target > 0 && title.isNotBlank()) { "Meta inválida" }
    val newGoal = Goal(
      id = "g_" + UUID.randomUUID().toString().take(6),
      title = title,
      category = category,
      current = 0,
      target = target,
      unit = unit,
      deadline = deadline,
      xpReward = 0,
      isCompleted = false
    )
    _state.update { it.copy(goals = it.goals + newGoal) }
  }

  fun addWater(ml: Int) {
    require(ml in 1..5000) { "Quantidade de água inválida" }
    _state.update { curr ->
      val newTotal = (curr.waterConsumedMl + ml).coerceAtLeast(0)
      curr.copy(waterConsumedMl = newTotal)
    }
  }

  fun resetWater() {
    _state.update { it.copy(waterConsumedMl = 0) }
  }

  fun updateProfile(name: String, weightKg: Float, heightCm: Int, birthYear: Int, activityLevel: ActivityLevel, sex: Sex) {
    _state.update { curr ->
      curr.copy(
        profileConfigured = true,
        profile = curr.profile.copy(
          name = name,
          weightKg = weightKg,
          heightCm = heightCm,
          birthYear = birthYear,
          activityLevel = activityLevel,
          sex = sex
        )
      )
    }
  }

}
