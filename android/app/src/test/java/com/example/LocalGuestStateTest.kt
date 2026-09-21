package com.example

import com.example.data.CalisthenicsRepository
import com.example.data.SupabaseManager
import com.example.model.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class LocalGuestStateTest {
  @Test fun newInstallHasNoEarnedProgress() {
    val state = CalisthenicsRepository().state.value
    assertNull(state.currentUser)
    assertTrue(state.recentSessions.isEmpty())
    assertTrue(state.goals.isEmpty())
    assertTrue(state.achievements.none { it.isUnlocked })
    assertEquals(0, state.currentXp)
    assertEquals(1, state.currentLevel)
    assertEquals(0, state.streakDays)
    assertEquals(0, state.totalWorkoutsCount)
    assertEquals(0, state.waterConsumedMl)
  }

  @Test fun googleUnavailableNeverCreatesAnIdentityEvenOnRepeatedAttempts() {
    val repository = CalisthenicsRepository()
    repeat(3) { repository.requestGoogleSignIn() }
    assertNull(repository.state.value.currentUser)
    assertFalse(repository.state.value.isAuthLoading)
    assertNotNull(repository.state.value.authErrorMessage)
  }

  @Test fun guestSwitchClearsProfileWaterGoalsAndProgram() {
    val repository = CalisthenicsRepository()
    repository.enterGuest("Alice")
    repository.addWater(250)
    repository.addNewGoal("Meta local", 2, "reps", GoalCategory.FORCA, "", 99999)
    repository.setActiveProgram("p2")
    repository.updateProfile("Alice", 80f, 180, 1990, ActivityLevel.LEVE, Sex.FEMININO)
    repository.enterGuest("Bob")
    val state = repository.state.value
    assertEquals("Bob", state.profile.name)
    assertEquals(0, state.waterConsumedMl)
    assertTrue(state.goals.isEmpty())
    assertEquals("p1", state.activeProgram.id)
    assertFalse(state.profileConfigured)
    assertEquals(0, state.currentXp)
  }

  @Test fun repeatedGoalClaimsNeverAwardOrMarkCompleted() {
    val repository = CalisthenicsRepository()
    repository.enterGuest("Atleta")
    repository.addNewGoal("Flexões", 1, "reps", GoalCategory.FORCA, "", 500)
    val id = repository.state.value.goals.single().id
    repository.claimGoalReward(id) // even before reaching the target
    repository.updateGoalProgress(id, 1)
    repeat(5) { repository.claimGoalReward(id) }
    val state = repository.state.value
    assertEquals(0, state.currentXp)
    assertEquals(0, state.goals.single().xpReward)
    assertFalse(state.goals.single().isCompleted)
    assertNull(state.lastRewardedGoal)
    assertNotNull(state.notice)
  }

  @Test fun signOutAndFreshRepositoryDoNotRestoreLocalData() {
    val repository = CalisthenicsRepository()
    repository.enterGuest("Alice")
    repository.addWater(500)
    repository.persistenceUnavailable()
    repository.signOut()
    assertNull(repository.state.value.currentUser)
    assertEquals(0, repository.state.value.waterConsumedMl)
    assertNull(repository.state.value.notice)
    assertNull(CalisthenicsRepository().state.value.currentUser)
  }

  @Test fun syncFailsExplicitlyInsteadOfClaimingSuccess() = runBlocking {
    val manager = SupabaseManager.getInstance()
    manager.clearSession()
    assertFalse(manager.cloudStatus.value.isConnected)
    repeat(2) { assertTrue(manager.syncCloudData().isFailure) }
    assertFalse(manager.cloudStatus.value.isConnected)
    assertFalse(manager.cloudStatus.value.isSyncing)
    assertTrue(manager.cloudStatus.value.lastSyncMessage.contains("indisponível"))
  }

  @Test(expected = IllegalArgumentException::class)
  fun zeroTargetIsRejectedInsteadOfCreatingInvalidProgress() {
    CalisthenicsRepository().addNewGoal("Meta", 0, "reps", GoalCategory.FORCA, "", 0)
  }
  @Test fun verifiedAccountSwitchClearsEveryLocalDraftAndMetric() {
    val repository = CalisthenicsRepository()
    repository.authenticated("verified-a")
    repository.addWater(500)
    repository.addNewGoal("Draft", 2, "reps", GoalCategory.FORCA, "", 0)
    repository.authenticated("verified-b")
    assertEquals("verified-b", (repository.state.value.currentUser as com.example.data.AuthenticatedUser).userId)
    assertEquals(0, repository.state.value.waterConsumedMl)
    assertTrue(repository.state.value.goals.isEmpty())
    assertTrue(repository.state.value.recentSessions.isEmpty())
    assertEquals(0, repository.state.value.currentXp)
  }
  @Test fun refreshingSameVerifiedIdentityPreservesLocalDrafts() {
    val repository = CalisthenicsRepository()
    repository.authenticated("verified-a"); repository.addWater(250)
    repository.authenticated("verified-a")
    assertEquals(250, repository.state.value.waterConsumedMl)
  }
}
