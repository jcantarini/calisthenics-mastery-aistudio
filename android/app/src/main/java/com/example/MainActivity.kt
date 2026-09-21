package com.example

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.screens.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.AppNavTab
import com.example.ui.viewmodel.CalisthenicsViewModel

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        CalisthenicsMasteryApp()
      }
    }
  }
}

@Composable
fun CalisthenicsMasteryApp(
  viewModel: CalisthenicsViewModel = viewModel()
) {
  val context = LocalContext.current
  val activity = context as? Activity

  val appState by viewModel.appState.collectAsState()
  val selectedTab by viewModel.selectedTab.collectAsState()
  val activeWorkout by viewModel.activeWorkout.collectAsState()
  val timerState by viewModel.timerState.collectAsState()
  val supabaseStatus by viewModel.supabaseStatus.collectAsState()
  val nutrition = viewModel.calculateNutrition()

  // 1. Splash Screen Phase
  if (!appState.isSplashFinished) {
    SplashScreen(
      onSplashFinished = { viewModel.finishSplash() }
    )
    return
  }

  // 2. Authentication Phase (Google Sign-In or Guest Access)
  if (appState.currentUser == null) {
    LoginScreen(
      isLoading = appState.isAuthLoading,
      errorMessage = appState.authErrorMessage,
      onGoogleSignIn = {
        activity?.let { act ->
          viewModel.signInWithGoogle(act) {}
        }
      },
      onSelectGoogleAccount = { name, email ->
        viewModel.signInWithGoogleAccount(name, email)
      },
      onGuestSignIn = { athleteName ->
        viewModel.signInAsGuest(athleteName)
      }
    )
    return
  }

  // 3. Active Interactive Workout Player (Fullscreen)
  if (activeWorkout != null) {
    WorkoutPlayerScreen(
      session = activeWorkout!!,
      onCompleteSet = { viewModel.completeCurrentSet() },
      onSkipRest = { viewModel.skipRest() },
      onFinishWorkout = { viewModel.finishActiveWorkout() },
      onClose = { viewModel.closeWorkoutSession() }
    )
    return
  }

  // 4. Main App Scaffold with Obsidian Navigation Bar
  Scaffold(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg),
    bottomBar = {
      NavigationBar(
        containerColor = ObsidianSurface,
        contentColor = TextPrimary,
        tonalElevation = 8.dp
      ) {
        NavigationBarItem(
          modifier = Modifier.testTag("nav_tab_dashboard"),
          selected = selectedTab == AppNavTab.DASHBOARD,
          onClick = { viewModel.selectTab(AppNavTab.DASHBOARD) },
          icon = { Icon(imageVector = Icons.Default.FitnessCenter, contentDescription = "Hoje") },
          label = { Text("Hoje") },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = ObsidianBg,
            selectedTextColor = ElectricLime,
            indicatorColor = ElectricLime,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
          )
        )

        NavigationBarItem(
          modifier = Modifier.testTag("nav_tab_programas"),
          selected = selectedTab == AppNavTab.PROGRAMAS,
          onClick = { viewModel.selectTab(AppNavTab.PROGRAMAS) },
          icon = { Icon(imageVector = Icons.Default.SportsGymnastics, contentDescription = "Treinos") },
          label = { Text("Treinos") },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = ObsidianBg,
            selectedTextColor = ElectricLime,
            indicatorColor = ElectricLime,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
          )
        )

        NavigationBarItem(
          modifier = Modifier.testTag("nav_tab_timer"),
          selected = selectedTab == AppNavTab.TIMER,
          onClick = { viewModel.selectTab(AppNavTab.TIMER) },
          icon = { Icon(imageVector = Icons.Default.Timer, contentDescription = "Timer") },
          label = { Text("Timer") },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = ObsidianBg,
            selectedTextColor = ElectricLime,
            indicatorColor = ElectricLime,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
          )
        )

        NavigationBarItem(
          modifier = Modifier.testTag("nav_tab_metas"),
          selected = selectedTab == AppNavTab.METAS,
          onClick = { viewModel.selectTab(AppNavTab.METAS) },
          icon = { Icon(imageVector = Icons.Default.EmojiEvents, contentDescription = "Metas") },
          label = { Text("Metas") },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = ObsidianBg,
            selectedTextColor = ElectricLime,
            indicatorColor = ElectricLime,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
          )
        )

        NavigationBarItem(
          modifier = Modifier.testTag("nav_tab_perfil"),
          selected = selectedTab == AppNavTab.PERFIL,
          onClick = { viewModel.selectTab(AppNavTab.PERFIL) },
          icon = { Icon(imageVector = Icons.Default.WaterDrop, contentDescription = "Nutrição") },
          label = { Text("Nutrição") },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = ObsidianBg,
            selectedTextColor = ElectricLime,
            indicatorColor = ElectricLime,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
          )
        )
      }
    }
  ) { innerPadding ->
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(ObsidianBg)
        .padding(innerPadding)
    ) {
      when (selectedTab) {
        AppNavTab.DASHBOARD -> DashboardScreen(
          state = appState,
          onStartWorkout = { program -> viewModel.startWorkout(program) },
          onNavigateTab = { tab -> viewModel.selectTab(tab) }
        )
        AppNavTab.PROGRAMAS -> ProgramsScreen(
          activeProgramId = appState.activeProgram.id,
          onSelectActiveProgram = { id -> viewModel.setActiveProgram(id) },
          onStartWorkout = { program -> viewModel.startWorkout(program) }
        )
        AppNavTab.TIMER -> TimerScreen(
          timerState = timerState,
          onSelectPreset = { presetKey -> viewModel.selectTimerPreset(presetKey) },
          onToggleRun = { viewModel.toggleTimerRun() },
          onReset = { viewModel.resetTimer() },
          onSkip = { viewModel.skipTimerPhase() }
        )
        AppNavTab.METAS -> GoalsScreen(
          goals = appState.goals,
          lastRewardedGoal = appState.lastRewardedGoal,
          onIncrementGoal = { id, delta -> viewModel.incrementGoal(id, delta) },
          onClaimReward = { id -> viewModel.claimGoalReward(id) },
          onDismissReward = { viewModel.dismissGoalReward() },
          onAddNewGoal = { title, target, unit, category, deadline, xp ->
            viewModel.addNewGoal(title, target, unit, category, deadline, xp)
          }
        )
        AppNavTab.PERFIL -> DietProfileScreen(
          state = appState,
          nutrition = nutrition,
          supabaseStatus = supabaseStatus,
          onSyncSupabase = { viewModel.syncWithSupabase() },
          onAddWater = { ml -> viewModel.addWater(ml) },
          onResetWater = { viewModel.resetWater() },
          onUpdateProfile = { name, w, h, b, a, s ->
            viewModel.updateProfile(name, w, h, b, a, s)
          },
          onSignOut = { viewModel.signOut() }
        )
      }
    }
  }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
  Text(text = "Hello $name!", modifier = modifier)
}
