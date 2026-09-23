package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.CalisthenicsAppState
import com.example.data.CalisthenicsData
import com.example.data.CalisthenicsRepository
import com.example.data.SupabaseCloudStatus
import com.example.data.SupabaseManager
import com.example.model.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AppNavTab {
  DASHBOARD,
  PROGRAMAS,
  TIMER,
  METAS,
  PERFIL
}

data class TimerUiState(
  val config: TimerConfig = TimerConfig(),
  val selectedPresetKey: String = "hiit",
  val phase: TimerPhase = TimerPhase.PREP,
  val secondsRemaining: Int = 10,
  val currentRound: Int = 1,
  val currentSet: Int = 1,
  val isRunning: Boolean = false,
  val totalElapsedSec: Int = 0
)

data class ActiveWorkoutSessionState(
  val program: Program,
  val currentExerciseIndex: Int = 0,
  val completedSetsForCurrent: Int = 0,
  val isResting: Boolean = false,
  val restSecondsRemaining: Int = 60,
  val totalSetsCompleted: Int = 0,
  val elapsedSeconds: Int = 0,
  val isFinished: Boolean = false
)

data class NutritionRecommendation(
  val dailyCalories: Int,
  val proteinGrams: Int,
  val carbsGrams: Int,
  val fatGrams: Int,
  val waterLiters: Float
)

class CalisthenicsViewModel(application: Application) : AndroidViewModel(application) {

  private val repository = CalisthenicsRepository()
  val appState: StateFlow<CalisthenicsAppState> = repository.state

  private val _selectedTab = MutableStateFlow(AppNavTab.DASHBOARD)
  val selectedTab: StateFlow<AppNavTab> = _selectedTab.asStateFlow()

  private val _activeWorkout = MutableStateFlow<ActiveWorkoutSessionState?>(null)
  val activeWorkout: StateFlow<ActiveWorkoutSessionState?> = _activeWorkout.asStateFlow()

  private val _timerState = MutableStateFlow(TimerUiState())
  val timerState: StateFlow<TimerUiState> = _timerState.asStateFlow()

  val supabaseStatus: StateFlow<SupabaseCloudStatus> = SupabaseManager.getInstance().cloudStatus

  private var timerJob: Job? = null
  private var workoutTimerJob: Job? = null

  init {
    // Clear obsolete prototype identities; A1 never restores a session.
    repository.initPreferences(getApplication())

    // Set default timer configuration from default preset
    val initialPreset = CalisthenicsData.TIMER_PRESETS.find { it.key == "hiit" }
      ?: CalisthenicsData.TIMER_PRESETS.first()
    _timerState.value = TimerUiState(
      config = TimerConfig(
        prep = initialPreset.prep,
        work = initialPreset.work,
        rest = initialPreset.rest,
        rounds = initialPreset.rounds,
        sets = initialPreset.sets,
        setRest = initialPreset.setRest
      ),
      selectedPresetKey = initialPreset.key,
      phase = TimerPhase.PREP,
      secondsRemaining = initialPreset.prep
    )
  }

  fun finishSplash() {
    repository.finishSplash()
  }

  fun signInWithGoogle() { repository.requestGoogleSignIn() }

  fun signInAsGuest(athleteName: String) {
    clearLocalExecution()
    repository.enterGuest(athleteName)
  }

  private fun clearLocalExecution() {
    workoutTimerJob?.cancel()
    restCountdownJob?.cancel()
    timerJob?.cancel()
    _activeWorkout.value = null
    selectTimerPreset("hiit")
    _selectedTab.value = AppNavTab.DASHBOARD
    SupabaseManager.getInstance().clearSession()
  }

  fun signOut() {
    clearLocalExecution()
    repository.signOut()
  }

  fun dismissNotice() { repository.dismissNotice() }
  fun syncWithSupabase() {
    viewModelScope.launch { SupabaseManager.getInstance().syncCloudData() }
  }

  fun selectTab(tab: AppNavTab) {
    _selectedTab.value = tab
  }

  fun setActiveProgram(programId: String) {
    repository.setActiveProgram(programId)
  }

  fun incrementGoal(goalId: String, delta: Int) {
    repository.updateGoalProgress(goalId, delta)
  }

  fun claimGoalReward(goalId: String) {
    repository.claimGoalReward(goalId)
  }

  fun dismissGoalReward() {
    repository.dismissGoalReward()
  }

  fun addNewGoal(
    title: String,
    target: Int,
    unit: String,
    category: GoalCategory,
    deadline: String,
    xpReward: Int
  ) {
    repository.addNewGoal(title, target, unit, category, deadline, xpReward)
  }

  fun addWater(ml: Int) { repository.addWater(ml) }

  fun resetWater() {
    repository.resetWater()
  }

  fun updateProfile(
    name: String,
    weightKg: Float,
    heightCm: Int,
    birthYear: Int,
    activityLevel: ActivityLevel,
    sex: Sex
  ) {
    repository.updateProfile(name, weightKg, heightCm, birthYear, activityLevel, sex)
  }

  fun calculateNutrition(): NutritionRecommendation {
    val profile = appState.value.profile
    val age = 2026 - profile.birthYear

    // Harris-Benedict Formula
    val bmr = if (profile.sex == Sex.MASCULINO) {
      88.362f + (13.397f * profile.weightKg) + (4.799f * profile.heightCm) - (5.677f * age)
    } else {
      447.593f + (9.247f * profile.weightKg) + (3.098f * profile.heightCm) - (4.330f * age)
    }

    val multiplier = profile.activityLevel.factor.toFloat()
    val tdee = (bmr * multiplier).toInt()
    val proteinGrams = (profile.weightKg * 2.0f).toInt()
    val fatGrams = ((tdee * 0.25f) / 9f).toInt()
    val remainingCalories = tdee - (proteinGrams * 4) - (fatGrams * 9)
    val carbsGrams = (remainingCalories / 4).coerceAtLeast(100)
    val waterLiters = (profile.weightKg * 35f) / 1000f

    return NutritionRecommendation(
      dailyCalories = tdee,
      proteinGrams = proteinGrams,
      carbsGrams = carbsGrams,
      fatGrams = fatGrams,
      waterLiters = waterLiters
    )
  }

  // --- Active Workout Session Logic ---

  fun startWorkout(program: Program) {
    _activeWorkout.value = ActiveWorkoutSessionState(program = program)
    startWorkoutDurationTicker()
  }

  private fun startWorkoutDurationTicker() {
    workoutTimerJob?.cancel()
    workoutTimerJob = viewModelScope.launch {
      while (true) {
        delay(1000)
        _activeWorkout.value?.let { current ->
          if (!current.isFinished) {
            _activeWorkout.value = current.copy(elapsedSeconds = current.elapsedSeconds + 1)
          }
        }
      }
    }
  }

  fun completeCurrentSet() {
    val current = _activeWorkout.value ?: return
    if (current.isFinished || current.isResting) return
    val exercise = current.program.exercises.getOrNull(current.currentExerciseIndex) ?: return

    val totalSetsForExercise = exercise.sets.takeWhile { it.isDigit() }.toIntOrNull() ?: 3
    val restSec = exercise.rest.filter { it.isDigit() }.toIntOrNull() ?: 60

    val nextSetIndex = current.completedSetsForCurrent + 1
    val isExerciseFinished = nextSetIndex >= totalSetsForExercise

    if (isExerciseFinished) {
      val nextExerciseIndex = current.currentExerciseIndex + 1
      if (nextExerciseIndex >= current.program.exercises.size) {
        _activeWorkout.value = current.copy(
          completedSetsForCurrent = nextSetIndex,
          totalSetsCompleted = current.totalSetsCompleted + 1,
          isFinished = true,
          isResting = false
        )
        triggerHaptic(long = true)
      } else {
        _activeWorkout.value = current.copy(
          currentExerciseIndex = nextExerciseIndex,
          completedSetsForCurrent = 0,
          totalSetsCompleted = current.totalSetsCompleted + 1,
          isResting = true,
          restSecondsRemaining = restSec
        )
        startRestCountdown(restSec)
      }
    } else {
      _activeWorkout.value = current.copy(
        completedSetsForCurrent = nextSetIndex,
        totalSetsCompleted = current.totalSetsCompleted + 1,
        isResting = true,
        restSecondsRemaining = restSec
      )
      startRestCountdown(restSec)
    }
  }

  private var restCountdownJob: Job? = null
  private fun startRestCountdown(seconds: Int) {
    restCountdownJob?.cancel()
    restCountdownJob = viewModelScope.launch {
      var remaining = seconds
      triggerHaptic(long = false)
      while (remaining > 0) {
        delay(1000)
        remaining--
        _activeWorkout.value?.let { current ->
          _activeWorkout.value = current.copy(restSecondsRemaining = remaining)
        }
      }
      _activeWorkout.value?.let { current ->
        _activeWorkout.value = current.copy(isResting = false)
      }
      triggerHaptic(long = true)
    }
  }

  fun skipRest() {
    restCountdownJob?.cancel()
    _activeWorkout.value?.let { current ->
      _activeWorkout.value = current.copy(isResting = false, restSecondsRemaining = 0)
    }
  }

  fun finishActiveWorkout() {
    val current = _activeWorkout.value ?: return
    workoutTimerJob?.cancel()
    restCountdownJob?.cancel()
    _activeWorkout.value = current.copy(isFinished = true, isResting = false)
  }

  fun closeWorkoutSession() {
    workoutTimerJob?.cancel()
    restCountdownJob?.cancel()
    _activeWorkout.value = null
  }

  // --- Interval HIIT Timer Logic ---

  fun selectTimerPreset(presetKey: String) {
    val preset = CalisthenicsData.TIMER_PRESETS.find { it.key == presetKey } ?: return
    timerJob?.cancel()
    _timerState.value = TimerUiState(
      config = TimerConfig(
        prep = preset.prep,
        work = preset.work,
        rest = preset.rest,
        rounds = preset.rounds,
        sets = preset.sets,
        setRest = preset.setRest
      ),
      selectedPresetKey = preset.key,
      phase = TimerPhase.PREP,
      secondsRemaining = preset.prep,
      currentRound = 1,
      currentSet = 1,
      isRunning = false,
      totalElapsedSec = 0
    )
  }

  fun toggleTimerRun() {
    val current = _timerState.value
    if (current.isRunning) {
      timerJob?.cancel()
      _timerState.value = current.copy(isRunning = false)
    } else {
      _timerState.value = current.copy(isRunning = true)
      startTimerLoop()
    }
  }

  fun resetTimer() {
    timerJob?.cancel()
    val current = _timerState.value
    selectTimerPreset(current.selectedPresetKey)
  }

  fun skipTimerPhase() {
    transitionToNextPhase()
  }

  private fun startTimerLoop() {
    timerJob?.cancel()
    timerJob = viewModelScope.launch {
      while (_timerState.value.isRunning) {
        delay(1000)
        val current = _timerState.value
        val newRemaining = current.secondsRemaining - 1
        val newElapsed = current.totalElapsedSec + 1

        if (newRemaining <= 0) {
          _timerState.value = current.copy(totalElapsedSec = newElapsed)
          transitionToNextPhase()
        } else {
          _timerState.value = current.copy(
            secondsRemaining = newRemaining,
            totalElapsedSec = newElapsed
          )
          if (newRemaining in 1..3) {
            triggerHaptic(long = false)
          }
        }
      }
    }
  }

  private fun transitionToNextPhase() {
    val current = _timerState.value
    val config = current.config

    triggerHaptic(long = true)

    when (current.phase) {
      TimerPhase.PREP -> {
        _timerState.value = current.copy(
          phase = TimerPhase.WORK,
          secondsRemaining = config.work
        )
      }
      TimerPhase.WORK -> {
        if (current.currentRound < config.rounds) {
          _timerState.value = current.copy(
            phase = TimerPhase.REST,
            secondsRemaining = config.rest
          )
        } else if (current.currentSet < config.sets) {
          _timerState.value = current.copy(
            phase = TimerPhase.SET_REST,
            secondsRemaining = config.setRest
          )
        } else {
          _timerState.value = current.copy(
            phase = TimerPhase.DONE,
            secondsRemaining = 0,
            isRunning = false
          )
          timerJob?.cancel()

        }
      }
      TimerPhase.REST -> {
        val nextRound = current.currentRound + 1
        _timerState.value = current.copy(
          phase = TimerPhase.WORK,
          currentRound = nextRound,
          secondsRemaining = config.work
        )
      }
      TimerPhase.SET_REST -> {
        val nextSet = current.currentSet + 1
        _timerState.value = current.copy(
          phase = TimerPhase.WORK,
          currentRound = 1,
          currentSet = nextSet,
          secondsRemaining = config.work
        )
      }
      TimerPhase.DONE -> {
        resetTimer()
      }
    }
  }

  private fun triggerHaptic(long: Boolean) {
    try {
      val app = getApplication<Application>()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = app.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        val vibrator = vibratorManager?.defaultVibrator
        val effect = if (long) {
          VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE)
        } else {
          VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE)
        }
        vibrator?.vibrate(effect)
      } else {
        @Suppress("DEPRECATION")
        val vibrator = app.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (long) {
          @Suppress("DEPRECATION")
          vibrator?.vibrate(300)
        } else {
          @Suppress("DEPRECATION")
          vibrator?.vibrate(80)
        }
      }
    } catch (_: Exception) {}
  }
}
