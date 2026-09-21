package com.example

import androidx.compose.runtime.collectAsState
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.example.data.CalisthenicsData
import com.example.data.CalisthenicsRepository
import com.example.ui.screens.LoginScreen
import com.example.ui.screens.WorkoutPlayerScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.ActiveWorkoutSessionState
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class TrustBoundaryUiTest {
  @get:Rule val compose = createComposeRule()

  @Test fun googleButtonExplainsUnavailabilityWithoutAccountPicker() {
    val repository = CalisthenicsRepository()
    compose.setContent {
      val state = repository.state.collectAsState().value
      MyApplicationTheme {
        LoginScreen(state.isAuthLoading, state.authErrorMessage,
          repository::requestGoogleSignIn, repository::enterGuest)
      }
    }
    compose.onNodeWithText("Google indisponível por enquanto").performClick()
    compose.onNodeWithText("Login Google indisponível nesta versão. Você pode explorar como convidado.").assertExists()
    compose.onNodeWithText("Conta detectada: ").assertDoesNotExist()
    compose.runOnIdle { assertNull(repository.state.value.currentUser) }
  }

  @Test fun finishedWorkoutDoesNotClaimEarnedXpOrSavedHistory() {
    compose.setContent {
      MyApplicationTheme {
        WorkoutPlayerScreen(ActiveWorkoutSessionState(CalisthenicsData.PROGRAMS.first(), isFinished = true),
          {}, {}, {}, {})
      }
    }
    compose.onNodeWithText("Esta sessão não foi salva. Histórico e recompensas indisponíveis.").assertExists()
    compose.onNodeWithText("XP Ganho").assertDoesNotExist()
    compose.onNodeWithText("+120").assertDoesNotExist()
  }
}
