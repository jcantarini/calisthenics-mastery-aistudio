package com.example.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
  onSplashFinished: () -> Unit
) {
  val infiniteTransition = rememberInfiniteTransition(label = "pulse")
  val scale by infiniteTransition.animateFloat(
    initialValue = 0.95f,
    targetValue = 1.05f,
    animationSpec = infiniteRepeatable(
      animation = tween(1200, easing = FastOutSlowInEasing),
      repeatMode = RepeatMode.Reverse
    ),
    label = "logoScale"
  )

  LaunchedEffect(Unit) {
    delay(1800)
    onSplashFinished()
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg),
    contentAlignment = Alignment.Center
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
      modifier = Modifier.padding(24.dp)
    ) {
      // App Icon with glowing athletic ring
      Box(
        modifier = Modifier
          .scale(scale)
          .size(110.dp)
          .clip(CircleShape)
          .background(ElectricLime.copy(alpha = 0.15f))
          .border(2.5.dp, ElectricLime, CircleShape),
        contentAlignment = Alignment.Center
      ) {
        Image(
          painter = painterResource(id = R.drawable.img_app_icon),
          contentDescription = "Calisthenics Mastery Logo",
          contentScale = ContentScale.Crop,
          modifier = Modifier
            .size(94.dp)
            .clip(CircleShape)
        )
      }

      Spacer(modifier = Modifier.height(28.dp))

      // App Title & Tagline
      Text(
        text = "CALISTHENICS",
        color = TextPrimary,
        fontSize = 28.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 2.sp
      )
      Text(
        text = "MASTERY",
        color = ElectricLime,
        fontSize = 28.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 2.sp
      )

      Spacer(modifier = Modifier.height(10.dp))

      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(8.dp))
          .background(ObsidianSurfaceElevated)
          .padding(horizontal = 12.dp, vertical = 5.dp)
      ) {
        Text(
          text = "Domine o peso do seu corpo",
          color = TextSecondary,
          fontSize = 13.sp,
          fontWeight = FontWeight.Medium
        )
      }

      Spacer(modifier = Modifier.height(48.dp))

      // Modern athletic loading spinner
      CircularProgressIndicator(
        color = ElectricLime,
        trackColor = ObsidianSurfaceElevated,
        strokeWidth = 3.dp,
        modifier = Modifier.size(32.dp)
      )
    }

    // Version label at bottom
    Text(
      text = "v1.0 • Calisthenics Mastery",
      color = TextMuted,
      fontSize = 11.sp,
      modifier = Modifier
        .align(Alignment.BottomCenter)
        .padding(bottom = 24.dp)
    )
  }
}
