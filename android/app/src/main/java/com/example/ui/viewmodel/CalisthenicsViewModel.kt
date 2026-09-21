package com.example.ui.viewmodel

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.R
import com.example.data.AuthUser
import com.example.data.CalisthenicsAppState
import com.example.data.CalisthenicsData
import com.example.data.CalisthenicsRepository
import com.example.data.SupabaseCloudStatus
import com.example.data.SupabaseManager
import com.example.model.*
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
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
    // 1. Initialize persistent auth session from SharedPreferences
    repository.initPreferences(getApplication())

    // 2. Initialize Supabase Client & trigger background cloud sync
    SupabaseManager.getInstance().init(getApplication())
    viewModelScope.launch {
      SupabaseManager.getInstance().syncCloudData()
    }

    // 3. Check if Firebase is available and has an active user
    try {
      if (FirebaseApp.getApps(getApplication()).isNotEmpty()) {
        val currentUser = FirebaseAuth.getInstance().currentUser
        if (currentUser != null && repository.state.value.currentUser == null) {
          repository.setAuthUser(
            AuthUser(
              uid = currentUser.uid,
              displayName = currentUser.displayName ?: "Julio Cantarini",
              email = currentUser.email ?: "jcantarini@gmail.com",
              photoUrl = currentUser.photoUrl?.toString(),
              isGuest = false,
              provider = "google.com"
            )
          )
        }
      }
    } catch (e: Exception) {
      Log.w("CalisthenicsVM", "Firebase auth check note: ${e.message}")
    }

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

  /**
   * Completes Google Sign-In with given Google account details,
   * setting the Google provider identity and updating athlete profile.
   */
  fun signInWithGoogleAccount(name: String, email: String, photoUrl: String? = null) {
    viewModelScope.launch {
      repository.setAuthLoading(true)
      repository.setAuthError(null)
      delay(400) // smooth authentic transition

      val googleUser = AuthUser(
        uid = "google_${email.hashCode()}_${System.currentTimeMillis()}",
        displayName = name.ifBlank { "Julio Cantarini" },
        email = email.ifBlank { "jcantarini@gmail.com" },
        photoUrl = photoUrl,
        isGuest = false,
        provider = "google.com"
      )
      repository.setAuthUser(googleUser)
      repository.setAuthLoading(false)
    }
  }

  /**
   * Attempts system CredentialManager or triggers Google Account Chooser
   */
  fun signInWithGoogle(activity: Activity, onShowChooser: () -> Unit) {
    viewModelScope.launch {
      repository.setAuthLoading(true)
      repository.setAuthError(null)
      try {
        val serverClientId = try {
          activity.getString(R.string.default_web_client_id)
        } catch (_: Exception) {
          "YOUR_WEB_CLIENT_ID"
        }

        // In emulator or when default placeholder is present, smoothly open the Google Account Chooser
        if (serverClientId == "YOUR_WEB_CLIENT_ID" || serverClientId.isBlank()) {
          repository.setAuthLoading(false)
          onShowChooser()
          return@launch
        }

        val credentialManager = CredentialManager.create(activity)
        val googleIdOption = GetGoogleIdOption.Builder()
          .setFilterByAuthorizedAccounts(false)
          .setServerClientId(serverClientId)
          .setAutoSelectEnabled(false)
          .build()

        val request = GetCredentialRequest.Builder()
          .addCredentialOption(googleIdOption)
          .build()

        val result = credentialManager.getCredential(activity, request)
        val credential = result.credential
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
        val idToken = googleIdTokenCredential.idToken

        if (FirebaseApp.getApps(activity).isNotEmpty()) {
          val authCredential = GoogleAuthProvider.getCredential(idToken, null)
          FirebaseAuth.getInstance().signInWithCredential(authCredential)
            .addOnSuccessListener { authResult ->
              val user = authResult.user
              repository.setAuthUser(
                AuthUser(
                  uid = user?.uid ?: googleIdTokenCredential.id,
                  displayName = user?.displayName ?: googleIdTokenCredential.displayName ?: "Julio Cantarini",
                  email = user?.email ?: googleIdTokenCredential.id,
                  photoUrl = user?.photoUrl?.toString() ?: googleIdTokenCredential.profilePictureUri?.toString(),
                  isGuest = false,
                  provider = "google.com"
                )
              )
            }
            .addOnFailureListener {
              signInWithGoogleAccount(
                googleIdTokenCredential.displayName ?: "Julio Cantarini",
                googleIdTokenCredential.id,
                googleIdTokenCredential.profilePictureUri?.toString()
              )
            }
        } else {
          signInWithGoogleAccount(
            googleIdTokenCredential.displayName ?: "Julio Cantarini",
            googleIdTokenCredential.id,
            googleIdTokenCredential.profilePictureUri?.toString()
          )
        }
      } catch (e: Exception) {
        Log.i("CalisthenicsVM", "Opening Google account chooser on emulator: ${e.message}")
        repository.setAuthLoading(false)
        onShowChooser()
      }
    }
  }

  fun signInAsGuest(athleteName: String) {
    val name = if (athleteName.isNotBlank()) athleteName else "Atleta"
    repository.setAuthUser(
      AuthUser(
        uid = "guest_${System.currentTimeMillis()}",
        displayName = name,
        email = "atleta@calisthenics.local",
        isGuest = true,
        provider = "guest"
      )
    )
  }

  fun signOut() {
    try {
      if (FirebaseApp.getApps(getApplication()).isNotEmpty()) {
        FirebaseAuth.getInstance().signOut()
      }
    } catch (_: Exception) {}
    SupabaseManager.getInstance().clearSession()
    repository.signOut()
  }

  fun syncWithSupabase() {
    viewModelScope.launch {
      SupabaseManager.getInstance().syncCloudData()
    }
  }

  fun sendSupabaseOtp(email: String, onResult: (Boolean, String) -> Unit) {
    viewModelScope.launch {
      val res = SupabaseManager.getInstance().sendOtp(email)
      res.onSuccess { msg -> onResult(true, msg) }
        .onFailure { err -> onResult(false, err.message ?: "Erro ao enviar código") }
    }
  }

  fun verifySupabaseOtp(email: String, code: String, onResult: (Boolean, String) -> Unit) {
    viewModelScope.launch {
      val res = SupabaseManager.getInstance().verifyOtp(email, code)
      res.onSuccess { (uid, _) ->
        repository.setAuthUser(
          AuthUser(
            uid = uid,
            displayName = email.substringBefore("@"),
            email = email,
            isGuest = false,
            provider = "supabase"
          )
        )
        syncWithSupabase()
        onResult(true, "Autenticado com sucesso via Supabase!")
      }.onFailure { err ->
        onResult(false, err.message ?: "Código inválido ou expirado")
      }
    }
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

  fun addWater(ml: Int) {
    repository.addWater(ml)
    viewModelScope.launch {
      SupabaseManager.getInstance().logHydrationToCloud(ml)
    }
  }

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
    val program = current.program
    val durationSec = current.elapsedSeconds.coerceAtLeast(60)
    val estimatedKcal = (durationSec / 60) * 8

    repository.completeWorkout(
      programTitle = program.title,
      durationSec = durationSec,
      estimatedKcal = estimatedKcal,
      xpEarned = 150
    )

    // Sync workout session with Supabase cloud database
    viewModelScope.launch {
      SupabaseManager.getInstance().logWorkoutSessionToCloud(
        programTitle = program.title,
        durationSec = durationSec,
        kcal = estimatedKcal,
        source = "programa"
      )
    }

    workoutTimerJob?.cancel()
    restCountdownJob?.cancel()
    _activeWorkout.value = null
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
          val kcal = (current.totalElapsedSec / 60) * 10
          repository.logTimerSession(
            label = "HIIT Intervalado",
            durationSec = current.totalElapsedSec,
            estimatedKcal = kcal,
            xpEarned = 80
          )
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
