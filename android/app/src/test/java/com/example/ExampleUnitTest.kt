package com.example

import com.example.data.CalisthenicsData
import com.example.data.CalisthenicsRepository
import org.junit.Assert.*
import org.junit.Test

class ExampleUnitTest {
  @Test
  fun addition_isCorrect() {
    assertEquals(4, 2 + 2)
  }

  @Test
  fun testCalisthenicsProgramsLoaded() {
    val programs = CalisthenicsData.PROGRAMS
    assertTrue(programs.isNotEmpty())
    assertEquals(5, programs.size)
    val fundacao = programs.first { it.slug == "fundacao" }
    assertEquals("Fundação", fundacao.title)
    assertTrue(fundacao.exercises.isNotEmpty())
  }

  @Test
  fun testWorkoutCompletionUpdatesXp() {
    val repository = CalisthenicsRepository()
    val initialXp = repository.state.value.currentXp
    repository.completeWorkout("Fundação - Dia 1", 1800, 250, 120)
    val updatedXp = repository.state.value.currentXp
    assertEquals(initialXp + 120, updatedXp)
  }

  @Test
  fun testHydrationTracking() {
    val repository = CalisthenicsRepository()
    val initialWater = repository.state.value.waterConsumedMl
    repository.addWater(250)
    assertEquals(initialWater + 250, repository.state.value.waterConsumedMl)
    repository.resetWater()
    assertEquals(0, repository.state.value.waterConsumedMl)
  }

  @Test
  fun testAuthFlow() {
    val repository = CalisthenicsRepository()
    assertNull(repository.state.value.currentUser)
    assertFalse(repository.state.value.isSplashFinished)

    repository.finishSplash()
    assertTrue(repository.state.value.isSplashFinished)

    val testUser = com.example.data.AuthUser(
      uid = "uid123",
      displayName = "Atleta Calistênico",
      email = "atleta@test.com"
    )
    repository.setAuthUser(testUser)
    assertEquals("Atleta Calistênico", repository.state.value.currentUser?.displayName)
    assertEquals("Atleta Calistênico", repository.state.value.profile.name)

    repository.signOut()
    assertNull(repository.state.value.currentUser)
  }
}
