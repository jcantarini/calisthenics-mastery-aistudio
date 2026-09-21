package com.example.data

import android.content.Context
import android.content.SharedPreferences
import com.example.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

data class AuthUser(
  val uid: String,
  val displayName: String,
  val email: String,
  val photoUrl: String? = null,
  val isGuest: Boolean = false,
  val provider: String = "google.com"
)

data class CalisthenicsAppState(
  val currentUser: AuthUser? = null,
  val isSplashFinished: Boolean = false,
  val isAuthLoading: Boolean = false,
  val authErrorMessage: String? = null,
  val profile: UserProfile = UserProfile(),
  val activeProgram: Program = CalisthenicsData.PROGRAMS.first(),
  val goals: List<Goal> = CalisthenicsData.DEFAULT_GOALS,
  val achievements: List<Achievement> = CalisthenicsData.DEFAULT_ACHIEVEMENTS,
  val recentSessions: List<WorkoutSession> = listOf(
    WorkoutSession("s1", System.currentTimeMillis() - 86400000L * 2, "Fundação - Dia 1", 1800, 240, "programa"),
    WorkoutSession("s2", System.currentTimeMillis() - 86400000L, "HIIT Tabata", 900, 150, "timer")
  ),
  val currentXp: Int = 420,
  val currentLevel: Int = 2, // Recruta
  val streakDays: Int = 3,
  val totalWorkoutsCount: Int = 5,
  val totalMinutesTrained: Int = 135,
  val totalCaloriesBurned: Int = 780,
  val waterConsumedMl: Int = 1250,
  val waterTargetMl: Int = 2500,
  val lastRewardedGoal: Goal? = null
)

class CalisthenicsRepository {

  private var preferences: SharedPreferences? = null
  private val _state = MutableStateFlow(CalisthenicsAppState())
  val state: StateFlow<CalisthenicsAppState> = _state.asStateFlow()

  fun initPreferences(context: Context) {
    preferences = context.getSharedPreferences("calisthenics_auth_prefs", Context.MODE_PRIVATE)
    preferences?.let { prefs ->
      val savedUid = prefs.getString("user_uid", null)
      if (!savedUid.isNullOrBlank()) {
        val name = prefs.getString("user_name", "Julio Cantarini") ?: "Julio Cantarini"
        val email = prefs.getString("user_email", "jcantarini@gmail.com") ?: "jcantarini@gmail.com"
        val photoUrl = prefs.getString("user_photo", null)
        val isGuest = prefs.getBoolean("user_is_guest", false)
        val provider = prefs.getString("user_provider", "google.com") ?: "google.com"

        val restoredUser = AuthUser(
          uid = savedUid,
          displayName = name,
          email = email,
          photoUrl = photoUrl,
          isGuest = isGuest,
          provider = provider
        )
        _state.update { curr ->
          curr.copy(
            currentUser = restoredUser,
            profile = curr.profile.copy(name = name)
          )
        }
      }
    }
  }

  fun setAuthUser(user: AuthUser?) {
    preferences?.edit()?.apply {
      if (user != null) {
        putString("user_uid", user.uid)
        putString("user_name", user.displayName)
        putString("user_email", user.email)
        putString("user_photo", user.photoUrl)
        putBoolean("user_is_guest", user.isGuest)
        putString("user_provider", user.provider)
      } else {
        clear()
      }
      apply()
    }

    _state.update { curr ->
      val updatedProfile = if (user != null && user.displayName.isNotBlank()) {
        curr.profile.copy(name = user.displayName)
      } else {
        curr.profile
      }
      curr.copy(
        currentUser = user,
        profile = updatedProfile,
        isAuthLoading = false,
        authErrorMessage = null
      )
    }
  }

  fun setAuthLoading(loading: Boolean) {
    _state.update { it.copy(isAuthLoading = loading) }
  }

  fun setAuthError(error: String?) {
    _state.update { it.copy(authErrorMessage = error, isAuthLoading = false) }
  }

  fun finishSplash() {
    _state.update { it.copy(isSplashFinished = true) }
  }

  fun signOut() {
    preferences?.edit()?.clear()?.apply()
    _state.update { it.copy(currentUser = null) }
  }

  fun setActiveProgram(programId: String) {
    val found = CalisthenicsData.PROGRAMS.find { it.id == programId } ?: return
    _state.update { it.copy(activeProgram = found) }
  }

  fun completeWorkout(programTitle: String, durationSec: Int, estimatedKcal: Int, xpEarned: Int = 120) {
    _state.update { curr ->
      val newXp = curr.currentXp + xpEarned
      val newLevel = calculateLevel(newXp)
      val newSession = WorkoutSession(
        id = UUID.randomUUID().toString(),
        timestamp = System.currentTimeMillis(),
        label = programTitle,
        durationSec = durationSec,
        kcalBurned = estimatedKcal,
        source = "programa"
      )
      curr.copy(
        currentXp = newXp,
        currentLevel = newLevel,
        streakDays = curr.streakDays + 1,
        totalWorkoutsCount = curr.totalWorkoutsCount + 1,
        totalMinutesTrained = curr.totalMinutesTrained + (durationSec / 60),
        totalCaloriesBurned = curr.totalCaloriesBurned + estimatedKcal,
        recentSessions = listOf(newSession) + curr.recentSessions
      )
    }
  }

  fun logTimerSession(label: String, durationSec: Int, estimatedKcal: Int, xpEarned: Int = 60) {
    _state.update { curr ->
      val newXp = curr.currentXp + xpEarned
      val newLevel = calculateLevel(newXp)
      val newSession = WorkoutSession(
        id = UUID.randomUUID().toString(),
        timestamp = System.currentTimeMillis(),
        label = label,
        durationSec = durationSec,
        kcalBurned = estimatedKcal,
        source = "timer"
      )
      // Check timer achievement
      val updatedAchievements = curr.achievements.map {
        if (it.id == "a3") it.copy(isUnlocked = true) else it
      }
      curr.copy(
        currentXp = newXp,
        currentLevel = newLevel,
        totalWorkoutsCount = curr.totalWorkoutsCount + 1,
        totalMinutesTrained = curr.totalMinutesTrained + (durationSec / 60),
        totalCaloriesBurned = curr.totalCaloriesBurned + estimatedKcal,
        recentSessions = listOf(newSession) + curr.recentSessions,
        achievements = updatedAchievements
      )
    }
  }

  fun updateGoalProgress(goalId: String, delta: Int) {
    _state.update { curr ->
      val updatedGoals = curr.goals.map { goal ->
        if (goal.id == goalId) {
          val newCurrent = (goal.current + delta).coerceAtLeast(0)
          val completed = newCurrent >= goal.target
          goal.copy(current = newCurrent, isCompleted = completed)
        } else {
          goal
        }
      }
      curr.copy(goals = updatedGoals)
    }
  }

  fun claimGoalReward(goalId: String) {
    _state.update { curr ->
      val targetGoal = curr.goals.find { it.id == goalId } ?: return@update curr
      val newXp = curr.currentXp + targetGoal.xpReward
      val newLevel = calculateLevel(newXp)
      val updatedGoals = curr.goals.map {
        if (it.id == goalId) it.copy(isCompleted = true) else it
      }
      curr.copy(
        currentXp = newXp,
        currentLevel = newLevel,
        goals = updatedGoals,
        lastRewardedGoal = targetGoal
      )
    }
  }

  fun dismissGoalReward() {
    _state.update { it.copy(lastRewardedGoal = null) }
  }

  fun addNewGoal(title: String, target: Int, unit: String, category: GoalCategory, deadline: String, xpReward: Int) {
    val newGoal = Goal(
      id = "g_" + UUID.randomUUID().toString().take(6),
      title = title,
      category = category,
      current = 0,
      target = target,
      unit = unit,
      deadline = deadline,
      xpReward = xpReward,
      isCompleted = false
    )
    _state.update { it.copy(goals = it.goals + newGoal) }
  }

  fun addWater(ml: Int) {
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

  private fun calculateLevel(xp: Int): Int {
    return when {
      xp >= 2000 -> 5 // Mestre da Barra
      xp >= 1200 -> 4 // Força Bruta
      xp >= 700 -> 3  // Atleta
      xp >= 300 -> 2  // Recruta
      else -> 1       // Novato
    }
  }
}
