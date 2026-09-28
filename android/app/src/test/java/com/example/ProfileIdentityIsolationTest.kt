package com.example

import android.app.Application
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import com.example.data.*
import com.example.model.*
import com.example.ui.screens.DietProfileScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.CalisthenicsViewModel
import com.example.ui.viewmodel.NutritionRecommendation
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ProfileIdentityIsolationTest {

  @get:Rule
  val composeTestRule = createComposeRule()

  private fun calculateSyntheticNutrition(profile: UserProfile): NutritionRecommendation {
    val age = 2026 - profile.birthYear
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

  @Test
  fun accountToGuestTransitionNeverLeaksSyntheticProfileOrCalculations() {
    val repository = CalisthenicsRepository()

    // 1. Account A logs in and configures synthetic profile
    repository.authenticated("user_account_a")
    repository.updateProfile(
      name = "Teste A",
      weightKg = 83f,
      heightCm = 182,
      birthYear = 1985,
      activityLevel = ActivityLevel.INTENSO,
      sex = Sex.MASCULINO
    )

    val stateA = repository.state.value
    assertTrue(stateA.currentUser is AuthenticatedUser)
    assertEquals("user_account_a", (stateA.currentUser as AuthenticatedUser).userId)
    assertEquals("Teste A", stateA.profile.name)
    assertEquals(83f, stateA.profile.weightKg)
    assertEquals(182, stateA.profile.heightCm)
    assertTrue(stateA.profileConfigured)

    val nutritionA = calculateSyntheticNutrition(stateA.profile)
    assertEquals(166, nutritionA.proteinGrams) // 83 * 2.0
    assertEquals(2.905f, nutritionA.waterLiters, 0.01f) // (83 * 35) / 1000

    // 2. Sign out and enter as Guest
    repository.signOut()
    assertNull(repository.state.value.currentUser)

    repository.enterGuest("Convidado X")
    val guestState = repository.state.value

    // 3. Confirm none of Account A's values exist in Guest
    assertTrue(guestState.currentUser is GuestUser)
    assertEquals("Convidado X", (guestState.currentUser as GuestUser).displayName)
    assertNotEquals("Teste A", guestState.profile.name)
    assertNotEquals(83f, guestState.profile.weightKg)
    assertNotEquals(182, guestState.profile.heightCm)
    assertFalse(guestState.profileConfigured)

    // Check defaults
    assertEquals(72.0f, guestState.profile.weightKg)
    assertEquals(175, guestState.profile.heightCm)

    // Check calculations
    val guestNutrition = calculateSyntheticNutrition(guestState.profile)
    assertEquals(144, guestNutrition.proteinGrams) // 72 * 2.0, NOT 166
    assertEquals(2.52f, guestNutrition.waterLiters, 0.01f) // 72 * 35 / 1000, NOT 2.905f
  }

  @Test
  fun guestToAccountTransitionNeverTransfersGuestDataToAccount() {
    val repository = CalisthenicsRepository()

    // 1. Guest enters and configures custom profile
    repository.enterGuest("Convidado Inicial")
    repository.updateProfile(
      name = "Convidado Sintetico",
      weightKg = 64f,
      heightCm = 166,
      birthYear = 2001,
      activityLevel = ActivityLevel.LEVE,
      sex = Sex.FEMININO
    )

    val guestState = repository.state.value
    assertEquals("Convidado Sintetico", guestState.profile.name)
    assertEquals(64f, guestState.profile.weightKg)
    assertEquals(166, guestState.profile.heightCm)
    assertTrue(guestState.profileConfigured)

    // 2. Logout and login as Account A
    repository.signOut()
    repository.authenticated("user_account_a")

    val accountState = repository.state.value
    assertTrue(accountState.currentUser is AuthenticatedUser)
    assertEquals("user_account_a", (accountState.currentUser as AuthenticatedUser).userId)

    // Ensure none of guest's values were transferred to the account
    assertNotEquals("Convidado Sintetico", accountState.profile.name)
    assertNotEquals(64f, accountState.profile.weightKg)
    assertNotEquals(166, accountState.profile.heightCm)
    assertEquals("Atleta", accountState.profile.name)
    assertEquals(72.0f, accountState.profile.weightKg)
    assertEquals(175, accountState.profile.heightCm)
    assertFalse(accountState.profileConfigured)

    val accountNutrition = calculateSyntheticNutrition(accountState.profile)
    assertEquals(144, accountNutrition.proteinGrams) // default 72kg, not guest's 64kg (128)
  }

  @Test
  fun accountAToAccountBTransitionNeverLeaksData() {
    val repository = CalisthenicsRepository()

    // 1. Account A configures profile
    repository.authenticated("user_account_a")
    repository.updateProfile(
      name = "Atleta A",
      weightKg = 92f,
      heightCm = 191,
      birthYear = 1990,
      activityLevel = ActivityLevel.ATLETA,
      sex = Sex.MASCULINO
    )

    // 2. Switch to Account B
    repository.authenticated("user_account_b")
    val stateB = repository.state.value

    assertEquals("user_account_b", (stateB.currentUser as AuthenticatedUser).userId)
    assertNotEquals("Atleta A", stateB.profile.name)
    assertNotEquals(92f, stateB.profile.weightKg)
    assertNotEquals(191, stateB.profile.heightCm)
    assertEquals("Atleta", stateB.profile.name)
    assertEquals(72.0f, stateB.profile.weightKg)
    assertEquals(175, stateB.profile.heightCm)
    assertFalse(stateB.profileConfigured)
  }

  @Test
  fun uiEditableFieldsAndCardsDoNotRetainPriorIdentityData() {
    val repository = CalisthenicsRepository()

    // Setup Account A with synthetic profile
    repository.authenticated("user_account_a")
    repository.updateProfile(
      name = "Teste A",
      weightKg = 83f,
      heightCm = 182,
      birthYear = 1985,
      activityLevel = ActivityLevel.INTENSO,
      sex = Sex.MASCULINO
    )

    val nutritionA = calculateSyntheticNutrition(repository.state.value.profile)
    val currentAppState = androidx.compose.runtime.mutableStateOf(repository.state.value)
    val currentNutrition = androidx.compose.runtime.mutableStateOf(nutritionA)

    composeTestRule.setContent {
      MyApplicationTheme {
        DietProfileScreen(
          state = currentAppState.value,
          nutrition = currentNutrition.value,
          onAddWater = {},
          onResetWater = {},
          onUpdateProfile = { n, w, h, b, a, s ->
            repository.updateProfile(n, w, h, b, a, s)
            currentAppState.value = repository.state.value
            currentNutrition.value = calculateSyntheticNutrition(repository.state.value.profile)
          },
          onSignOut = {
            repository.signOut()
            currentAppState.value = repository.state.value
          }
        )
      }
    }

    // Verify Account A UI shows notice and stats
    composeTestRule.onNodeWithText("Perfil temporário em memória").assertExists()
    composeTestRule.onNodeWithTag("diet_profile_list").performScrollToNode(hasTestTag("athlete_weight_stat"))
    composeTestRule.onNodeWithTag("athlete_weight_stat").assertTextEquals("83.0 kg")
    composeTestRule.onNodeWithTag("athlete_height_stat").assertTextEquals("182 cm")

    // Click Edit to verify dialog shows Account A values
    composeTestRule.onNodeWithTag("edit_profile_button").performClick()
    composeTestRule.onNodeWithTag("athlete_name_input").assertTextContains("Teste A")
    composeTestRule.onNodeWithTag("athlete_weight_input").assertTextContains("83.0")
    composeTestRule.onNodeWithTag("athlete_height_input").assertTextContains("182")
    composeTestRule.onNodeWithTag("apply_profile_button").assertExists()
    composeTestRule.onNodeWithText("Cancelar").performClick()

    // Now transition to Guest in the repository
    repository.signOut()
    repository.enterGuest("Convidado Y")
    val guestNutrition = calculateSyntheticNutrition(repository.state.value.profile)

    // Recompose with Guest State dynamically
    composeTestRule.runOnIdle {
      currentAppState.value = repository.state.value
      currentNutrition.value = guestNutrition
    }

    // Verify Guest UI shows example values, NOT Account A's values
    composeTestRule.onNodeWithText("Valores padrão de exemplo").assertExists()
    composeTestRule.onNodeWithTag("diet_profile_list").performScrollToNode(hasTestTag("athlete_weight_stat"))
    composeTestRule.onNodeWithText("Teste A").assertDoesNotExist()
    composeTestRule.onNodeWithText("83.0 kg").assertDoesNotExist()
    composeTestRule.onNodeWithText("182 cm").assertDoesNotExist()
    composeTestRule.onNodeWithText("Peso (exemplo)").assertExists()
    composeTestRule.onNodeWithText("Altura (exemplo)").assertExists()

    // Open Edit Dialog for Guest: verify fields are clean/empty, NOT pre-filled with 83.0 or 182
    composeTestRule.onNodeWithTag("edit_profile_button").performClick()
    composeTestRule.onNodeWithTag("athlete_name_input").assertTextContains("")
    composeTestRule.onNodeWithTag("athlete_weight_input").assertTextContains("")
    composeTestRule.onNodeWithTag("athlete_height_input").assertTextContains("")

    // Apply new guest values
    composeTestRule.onNodeWithTag("athlete_name_input").performTextInput("Convidado Z")
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("68.5")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("172")
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextInput("1995")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    // Check repository updated guest
    assertEquals("Convidado Z", repository.state.value.profile.name)
    assertEquals(68.5f, repository.state.value.profile.weightKg)
    assertEquals(172, repository.state.value.profile.heightCm)
    assertEquals(1995, repository.state.value.profile.birthYear)
    assertTrue(repository.state.value.profileConfigured)
  }

  @Test
  fun viewModelIdentityTransitionsNeverLeakProfileOrCalculations() {
    val app: Application = ApplicationProvider.getApplicationContext()
    val vm = CalisthenicsViewModel(app)

    // 1. Enter as Guest A and update synthetic profile
    vm.signInAsGuest("Teste A")
    vm.updateProfile("Teste A", 83f, 182, 1985, ActivityLevel.INTENSO, Sex.MASCULINO)

    val stateA = vm.appState.value
    assertEquals("Teste A", stateA.profile.name)
    assertEquals(83f, stateA.profile.weightKg)
    assertEquals(182, stateA.profile.heightCm)
    assertTrue(stateA.profileConfigured)

    val nutritionA = vm.calculateNutrition()
    assertEquals(166, nutritionA.proteinGrams)

    // 2. Sign out
    vm.signOut()
    assertNull(vm.appState.value.currentUser)
    assertEquals("Atleta", vm.appState.value.profile.name)
    assertEquals(72.0f, vm.appState.value.profile.weightKg)
    assertEquals(175, vm.appState.value.profile.heightCm)
    assertFalse(vm.appState.value.profileConfigured)

    // 3. Enter as Guest B
    vm.signInAsGuest("Convidado B")
    val stateB = vm.appState.value
    assertEquals("Convidado B", (stateB.currentUser as GuestUser).displayName)
    assertEquals(72.0f, stateB.profile.weightKg)
    assertEquals(175, stateB.profile.heightCm)
    assertFalse(stateB.profileConfigured)

    val nutritionB = vm.calculateNutrition()
    assertEquals(144, nutritionB.proteinGrams)

    // 4. Update Guest B with distinct values
    vm.updateProfile("Convidado B", 64f, 166, 2001, ActivityLevel.LEVE, Sex.FEMININO)
    assertEquals(64f, vm.appState.value.profile.weightKg)
    assertEquals(166, vm.appState.value.profile.heightCm)
    assertTrue(vm.appState.value.profileConfigured)

    // 5. Sign out again
    vm.signOut()
    assertNull(vm.appState.value.currentUser)
    assertFalse(vm.appState.value.profileConfigured)
    assertEquals(72.0f, vm.appState.value.profile.weightKg)
  }

  @Test
  fun switchingIdentityWithOpenDialogDiscardsDraftAndForm() {
    val repository = CalisthenicsRepository()
    repository.authenticated("user_account_a")

    val currentAppState = androidx.compose.runtime.mutableStateOf(repository.state.value)
    val currentNutrition = androidx.compose.runtime.mutableStateOf(calculateSyntheticNutrition(repository.state.value.profile))

    composeTestRule.setContent {
      MyApplicationTheme {
        DietProfileScreen(
          state = currentAppState.value,
          nutrition = currentNutrition.value,
          onAddWater = {},
          onResetWater = {},
          onUpdateProfile = { n, w, h, b, a, s ->
            repository.updateProfile(n, w, h, b, a, s)
            currentAppState.value = repository.state.value
            currentNutrition.value = calculateSyntheticNutrition(repository.state.value.profile)
          },
          onSignOut = {
            repository.signOut()
            currentAppState.value = repository.state.value
          }
        )
      }
    }

    // 1. Open edit dialog in Account A
    composeTestRule.onNodeWithTag("edit_profile_button_header").performClick()
    composeTestRule.onNodeWithTag("athlete_name_input").assertExists()

    // 2. Type draft values without applying
    composeTestRule.onNodeWithTag("athlete_name_input").performTextInput("Rascunho A")
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("95.5")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("190")

    // Verify inputs have the draft text
    composeTestRule.onNodeWithTag("athlete_name_input").assertTextContains("Rascunho A")
    composeTestRule.onNodeWithTag("athlete_weight_input").assertTextContains("95.5")
    composeTestRule.onNodeWithTag("athlete_height_input").assertTextContains("190")

    // 3. Switch identity while dialog is still open
    repository.signOut()
    repository.enterGuest("Convidado B")
    composeTestRule.runOnIdle {
      currentAppState.value = repository.state.value
      currentNutrition.value = calculateSyntheticNutrition(repository.state.value.profile)
    }

    // 4. Confirm dialog is dismissed
    composeTestRule.onNodeWithTag("apply_profile_button").assertDoesNotExist()
    composeTestRule.onNodeWithTag("athlete_name_input").assertDoesNotExist()

    // 5. Open dialog in Guest mode and confirm absence of Account A draft data
    composeTestRule.onNodeWithTag("edit_profile_button_header").performClick()
    composeTestRule.onNodeWithTag("athlete_name_input").assertExists()
    composeTestRule.onNodeWithTag("athlete_name_input").assertTextContains("")
    composeTestRule.onNodeWithTag("athlete_weight_input").assertTextContains("")
    composeTestRule.onNodeWithTag("athlete_height_input").assertTextContains("")

    composeTestRule.onNodeWithText("Rascunho A").assertDoesNotExist()
    composeTestRule.onNodeWithText("95.5").assertDoesNotExist()
    composeTestRule.onNodeWithText("190").assertDoesNotExist()

    composeTestRule.onNodeWithText("Cancelar").performClick()
  }

  @Test
  fun applyingEmptyOrInvalidFieldsRejectsConfigurationAndRetainsDefaults() {
    val repository = CalisthenicsRepository()
    repository.enterGuest("Convidado Valida")

    val currentAppState = androidx.compose.runtime.mutableStateOf(repository.state.value)
    val currentNutrition = androidx.compose.runtime.mutableStateOf(calculateSyntheticNutrition(repository.state.value.profile))

    composeTestRule.setContent {
      MyApplicationTheme {
        DietProfileScreen(
          state = currentAppState.value,
          nutrition = currentNutrition.value,
          onAddWater = {},
          onResetWater = {},
          onUpdateProfile = { n, w, h, b, a, s ->
            repository.updateProfile(n, w, h, b, a, s)
            currentAppState.value = repository.state.value
            currentNutrition.value = calculateSyntheticNutrition(repository.state.value.profile)
          },
          onSignOut = {
            repository.signOut()
            currentAppState.value = repository.state.value
          }
        )
      }
    }

    // 1. Open edit dialog
    composeTestRule.onNodeWithTag("edit_profile_button_header").performClick()

    // 2. Click Apply with empty fields
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    // Confirm profile was NOT configured and defaults are retained
    assertFalse(repository.state.value.profileConfigured)
    assertEquals(72.0f, repository.state.value.profile.weightKg)
    assertEquals(175, repository.state.value.profile.heightCm)

    // Confirm error messages on fields
    composeTestRule.onNodeWithTag("athlete_weight_error", useUnmergedTree = true).assertExists()
    composeTestRule.onNodeWithTag("athlete_height_error", useUnmergedTree = true).assertExists()
    composeTestRule.onNodeWithText("Informe o peso").assertExists()
    composeTestRule.onNodeWithText("Informe a altura").assertExists()

    // 3. Try entering invalid non-positive values
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("-10")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("0")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    // Confirm profile remains unconfigured
    assertFalse(repository.state.value.profileConfigured)
    assertEquals(72.0f, repository.state.value.profile.weightKg)
    assertEquals(175, repository.state.value.profile.heightCm)
    composeTestRule.onNodeWithText("Peso inválido (deve ser positivo)").assertExists()
    composeTestRule.onNodeWithText("Altura inválida (deve ser positiva)").assertExists()

    // 4. Try entering text/letters
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("abc")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("xyz")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    assertFalse(repository.state.value.profileConfigured)

    // 5. Try entering 0 kg and negative height
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("0")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("-175")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    assertFalse(repository.state.value.profileConfigured)
    assertEquals(72.0f, repository.state.value.profile.weightKg)
    assertEquals(175, repository.state.value.profile.heightCm)
    composeTestRule.onNodeWithText("Peso inválido (deve ser positivo)").assertExists()
    composeTestRule.onNodeWithText("Altura inválida (deve ser positiva)").assertExists()

    // 6. Try valid weight and height but empty birthYear: does not apply nor configure profile
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("75.0")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("178")
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextClearance()
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    assertFalse(repository.state.value.profileConfigured)
    assertEquals(72.0f, repository.state.value.profile.weightKg)
    assertEquals(175, repository.state.value.profile.heightCm)
    composeTestRule.onNodeWithText("Informe o ano de nascimento").assertExists()

    // 7. Try valid weight and height but invalid birthYear
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextInput("1850")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    assertFalse(repository.state.value.profileConfigured)
    val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
    composeTestRule.onNodeWithText("Ano inválido (1900 a $currentYear)").assertExists()

    // 8. Cancel dialog and verify screen continues showing "Valores padrão de exemplo"
    composeTestRule.onNodeWithText("Cancelar").performClick()
    composeTestRule.onNodeWithText("Valores padrão de exemplo").assertExists()
    composeTestRule.onNodeWithTag("diet_profile_list").performScrollToNode(hasText("Peso (exemplo)"))
    composeTestRule.onNodeWithText("Peso (exemplo)").assertExists()
    composeTestRule.onNodeWithText("Altura (exemplo)").assertExists()
    assertFalse(repository.state.value.profileConfigured)
  }

  @Test
  fun mandatoryBirthYearValidationAndRetentionInSameSession() {
    val repository = CalisthenicsRepository()
    repository.enterGuest("Convidado Sessao")

    val currentAppState = androidx.compose.runtime.mutableStateOf(repository.state.value)
    val currentNutrition = androidx.compose.runtime.mutableStateOf(calculateSyntheticNutrition(repository.state.value.profile))

    composeTestRule.setContent {
      MyApplicationTheme {
        DietProfileScreen(
          state = currentAppState.value,
          nutrition = currentNutrition.value,
          onAddWater = {},
          onResetWater = {},
          onUpdateProfile = { n, w, h, b, a, s ->
            repository.updateProfile(n, w, h, b, a, s)
            currentAppState.value = repository.state.value
            currentNutrition.value = calculateSyntheticNutrition(repository.state.value.profile)
          },
          onSignOut = {
            repository.signOut()
            currentAppState.value = repository.state.value
          }
        )
      }
    }

    // 1. Open dialog and try applying with valid weight/height but empty year
    composeTestRule.onNodeWithTag("edit_profile_button_header").performClick()
    composeTestRule.onNodeWithTag("athlete_weight_input").performTextInput("78.0")
    composeTestRule.onNodeWithTag("athlete_height_input").performTextInput("180")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    // Should not apply and show "Informe o ano de nascimento"
    assertFalse(repository.state.value.profileConfigured)
    composeTestRule.onNodeWithText("Informe o ano de nascimento").assertExists()

    // 2. Try entering future year (greater than current year)
    val nextYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) + 5
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextInput(nextYear.toString())
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    assertFalse(repository.state.value.profileConfigured)

    // 3. Now fill all mandatory fields with valid values
    composeTestRule.onNodeWithTag("athlete_name_input").performTextInput("Atleta Valido")
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextClearance()
    composeTestRule.onNodeWithTag("athlete_birth_year_input").performTextInput("1994")
    composeTestRule.onNodeWithTag("apply_profile_button").performClick()

    // Verify all values are applied
    assertTrue(repository.state.value.profileConfigured)
    assertEquals("Atleta Valido", repository.state.value.profile.name)
    assertEquals(78.0f, repository.state.value.profile.weightKg)
    assertEquals(180, repository.state.value.profile.heightCm)
    assertEquals(1994, repository.state.value.profile.birthYear)

    // 4. Reopen the form and confirm that birth year and other fields are retained in the same session
    composeTestRule.onNodeWithTag("edit_profile_button_header").performClick()
    composeTestRule.onNodeWithTag("athlete_birth_year_input").assertTextContains("1994")
    composeTestRule.onNodeWithTag("athlete_weight_input").assertTextContains("78.0")
    composeTestRule.onNodeWithTag("athlete_height_input").assertTextContains("180")
    composeTestRule.onNodeWithTag("athlete_name_input").assertTextContains("Atleta Valido")

    // 5. Cancel without changes
    composeTestRule.onNodeWithText("Cancelar").performClick()
  }

  @Test
  fun repositoryRejectsInvalidBirthYearAndPreservesState() {
    val repository = CalisthenicsRepository()
    repository.authenticated("user_test_repo")

    // 1. Initial valid configuration
    repository.updateProfile("Atleta Repo", 80f, 178, 1992, ActivityLevel.MODERADO, Sex.MASCULINO)
    assertTrue(repository.state.value.profileConfigured)
    assertEquals(1992, repository.state.value.profile.birthYear)
    assertEquals(80f, repository.state.value.profile.weightKg)

    // 2. Attempt update with invalid birthYear (too old: 1850)
    repository.updateProfile("Tentativa Invalida", 85f, 185, 1850, ActivityLevel.INTENSO, Sex.MASCULINO)
    // Must preserve prior state
    assertEquals(1992, repository.state.value.profile.birthYear)
    assertEquals(80f, repository.state.value.profile.weightKg)
    assertEquals("Atleta Repo", repository.state.value.profile.name)

    // 3. Attempt update with future birthYear
    val futureYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) + 10
    repository.updateProfile("Tentativa Futura", 90f, 190, futureYear, ActivityLevel.INTENSO, Sex.MASCULINO)
    assertEquals(1992, repository.state.value.profile.birthYear)
    assertEquals(80f, repository.state.value.profile.weightKg)

    // 4. Attempt update with negative weight
    repository.updateProfile("Tentativa Peso Invalido", -80f, 178, 1995, ActivityLevel.MODERADO, Sex.MASCULINO)
    assertEquals(1992, repository.state.value.profile.birthYear)
    assertEquals(80f, repository.state.value.profile.weightKg)

    // 5. Valid update succeeds
    repository.updateProfile("Atleta Atualizado", 82f, 180, 1996, ActivityLevel.INTENSO, Sex.FEMININO)
    assertEquals(1996, repository.state.value.profile.birthYear)
    assertEquals(82f, repository.state.value.profile.weightKg)
    assertEquals(180, repository.state.value.profile.heightCm)
    assertEquals(Sex.FEMININO, repository.state.value.profile.sex)
  }
}
