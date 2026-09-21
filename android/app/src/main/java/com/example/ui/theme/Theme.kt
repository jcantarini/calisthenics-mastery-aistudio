package com.example.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val CalisthenicsDarkColorScheme = darkColorScheme(
  primary = ElectricLime,
  onPrimary = ObsidianBg,
  primaryContainer = ElectricLimeDark,
  onPrimaryContainer = ObsidianBg,
  secondary = EmberOrange,
  onSecondary = ObsidianBg,
  secondaryContainer = EmberDark,
  onSecondaryContainer = TextPrimary,
  background = ObsidianBg,
  onBackground = TextPrimary,
  surface = ObsidianSurface,
  onSurface = TextPrimary,
  surfaceVariant = ObsidianSurfaceElevated,
  onSurfaceVariant = TextSecondary,
  outline = ObsidianBorder,
  error = ErrorRed,
  onError = TextPrimary
)

private val CalisthenicsLightColorScheme = lightColorScheme(
  primary = ElectricLimeDark,
  onPrimary = ObsidianBg,
  secondary = EmberOrange,
  onSecondary = ObsidianBg,
  background = ObsidianBg,
  surface = ObsidianSurface,
  onBackground = TextPrimary,
  onSurface = TextPrimary
)

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = true, // Force the iconic obsidian athletic dark theme
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) CalisthenicsDarkColorScheme else CalisthenicsLightColorScheme
  val view = LocalView.current
  if (!view.isInEditMode) {
    SideEffect {
      val window = (view.context as? Activity)?.window
      if (window != null) {
        val insetsController = WindowCompat.getInsetsController(window, view)
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false
      }
    }
  }

  MaterialTheme(
    colorScheme = colorScheme,
    typography = Typography,
    content = content
  )
}
