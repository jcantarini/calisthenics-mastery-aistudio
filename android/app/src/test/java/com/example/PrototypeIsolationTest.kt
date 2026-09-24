package com.example

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.CalisthenicsData
import com.example.data.CalisthenicsRepository
import com.example.model.TimerPhase
import com.example.ui.viewmodel.CalisthenicsViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class PrototypeIsolationTest {
  private val app: Application = ApplicationProvider.getApplicationContext()
  @Before fun setup() { Dispatchers.setMain(StandardTestDispatcher()) }
  @After fun teardown() { Dispatchers.resetMain() }

  @Test fun oldFakeIdentityAndTokensAreClearedNotRestored() {
    app.getSharedPreferences("auth_migration_v1", Context.MODE_PRIVATE).edit().clear().commit()
    val names = listOf("calisthenics_auth_prefs", "supabase_client_prefs")
    names.forEach { app.getSharedPreferences(it, Context.MODE_PRIVATE).edit()
      .putString("user_uid", "fake-google-uid").putString("sb_access_token", "expired-token").commit() }
    val repository = CalisthenicsRepository()
    repository.initPreferences(app)
    assertNull(repository.state.value.currentUser)
    names.forEach { assertTrue(app.getSharedPreferences(it, Context.MODE_PRIVATE).all.isEmpty()) }
  }

  @Test fun emptyAndRepeatedWorkoutFinishesCreateNoHistoryOrRewards() {
    val vm = CalisthenicsViewModel(app)
    vm.signInAsGuest("Atleta")
    vm.startWorkout(CalisthenicsData.PROGRAMS.first())
    repeat(3) { vm.finishActiveWorkout() }
    assertEquals(0, vm.activeWorkout.value!!.elapsedSeconds)
    assertTrue(vm.activeWorkout.value!!.isFinished)
    assertTrue(vm.appState.value.recentSessions.isEmpty())
    assertEquals(0, vm.appState.value.currentXp)
    assertEquals(0, vm.appState.value.totalWorkoutsCount)
    vm.signOut()
    assertNull(vm.activeWorkout.value)
  }

  @Test fun manuallySkippingAllTimerPhasesDoesNotCreateEvidenceOrXp() {
    val vm = CalisthenicsViewModel(app)
    vm.signInAsGuest("Atleta")
    vm.selectTimerPreset("tabata")
    repeat(16) { vm.skipTimerPhase() }
    assertEquals(TimerPhase.DONE, vm.timerState.value.phase)
    assertEquals(0, vm.timerState.value.totalElapsedSec)
    assertTrue(vm.appState.value.recentSessions.isEmpty())
    assertEquals(0, vm.appState.value.currentXp)
    assertTrue(vm.appState.value.achievements.none { it.isUnlocked })
    vm.signOut()
    assertFalse(vm.timerState.value.isRunning)
    assertEquals(TimerPhase.PREP, vm.timerState.value.phase)
  }
}
