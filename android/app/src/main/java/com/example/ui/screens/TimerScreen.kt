package com.example.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.RotateLeft
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.CalisthenicsData
import com.example.model.TimerPhase
import com.example.ui.theme.*
import com.example.ui.viewmodel.TimerUiState

@Composable
fun TimerScreen(
  timerState: TimerUiState,
  onSelectPreset: (String) -> Unit,
  onToggleRun: () -> Unit,
  onReset: () -> Unit,
  onSkip: () -> Unit
) {
  val phaseColor = when (timerState.phase) {
    TimerPhase.PREP -> WarningGold
    TimerPhase.WORK -> ElectricLime
    TimerPhase.REST -> EmberOrange
    TimerPhase.SET_REST -> Color(0xFF58A6FF)
    TimerPhase.DONE -> SuccessGreen
  }

  val animatedColor by animateColorAsState(targetValue = phaseColor, label = "PhaseColor")

  val maxSeconds = when (timerState.phase) {
    TimerPhase.PREP -> timerState.config.prep
    TimerPhase.WORK -> timerState.config.work
    TimerPhase.REST -> timerState.config.rest
    TimerPhase.SET_REST -> timerState.config.setRest
    TimerPhase.DONE -> 1
  }.coerceAtLeast(1)

  val progress = (timerState.secondsRemaining.toFloat() / maxSeconds.toFloat()).coerceIn(0f, 1f)
  val animatedProgress by animateFloatAsState(targetValue = progress, label = "TimerProgress")

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg)
      .padding(16.dp),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    // Header Title
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column {
        Text(
          text = "Cronômetro HIIT",
          color = TextPrimary,
          fontSize = 24.sp,
          fontWeight = FontWeight.Black
        )
        Text(
          text = "Intervalos de calistenia, tabata e militar",
          color = TextSecondary,
          fontSize = 13.sp
        )
      }

      // Elapsed time indicator
      val elapsedMin = timerState.totalElapsedSec / 60
      val elapsedSec = timerState.totalElapsedSec % 60
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(12.dp))
          .background(ObsidianSurface)
          .border(1.dp, ObsidianBorder, RoundedCornerShape(12.dp))
          .padding(horizontal = 10.dp, vertical = 6.dp)
      ) {
        Text(
          text = "%02d:%02d".format(elapsedMin, elapsedSec),
          color = TextPrimary,
          fontWeight = FontWeight.Bold,
          fontSize = 13.sp
        )
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Presets Row
    LazyRow(
      horizontalArrangement = Arrangement.spacedBy(8.dp),
      modifier = Modifier.fillMaxWidth()
    ) {
      items(CalisthenicsData.TIMER_PRESETS) { preset ->
        val isSelected = preset.key == timerState.selectedPresetKey
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (isSelected) ElectricLime else ObsidianSurface)
            .border(1.dp, if (isSelected) ElectricLime else ObsidianBorder, RoundedCornerShape(14.dp))
            .clickable { onSelectPreset(preset.key) }
            .padding(horizontal = 14.dp, vertical = 8.dp)
        ) {
          Text(
            text = preset.label,
            color = if (isSelected) ObsidianBg else TextSecondary,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
          )
        }
      }
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Big Circular Countdown Display
    Box(
      contentAlignment = Alignment.Center,
      modifier = Modifier
        .size(270.dp)
        .padding(16.dp)
    ) {
      // Circular Track and Animated Fill
      Canvas(modifier = Modifier.fillMaxSize()) {
        val strokeWidth = 14.dp.toPx()
        // Background track
        drawCircle(
          color = ObsidianSurfaceElevated,
          style = Stroke(width = strokeWidth)
        )
        // Progress arc
        drawArc(
          color = animatedColor,
          startAngle = -90f,
          sweepAngle = 360f * animatedProgress,
          useCenter = false,
          style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        )
      }

      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Phase Pill
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(animatedColor.copy(alpha = 0.15f))
            .border(1.dp, animatedColor.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 4.dp)
        ) {
          Text(
            text = timerState.phase.label.uppercase(),
            color = animatedColor,
            fontWeight = FontWeight.Black,
            fontSize = 12.sp
          )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Seconds Countdown
        Text(
          text = "${timerState.secondsRemaining}",
          color = TextPrimary,
          fontSize = 64.sp,
          fontWeight = FontWeight.Black
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Round & Set Indicators
        Text(
          text = "Round ${timerState.currentRound}/${timerState.config.rounds} • Série ${timerState.currentSet}/${timerState.config.sets}",
          color = TextSecondary,
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold
        )
      }
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Phase Intervals Specs Card
    Card(
      shape = RoundedCornerShape(18.dp),
      colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
      border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
      modifier = Modifier.fillMaxWidth()
    ) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceAround
      ) {
        IntervalInfoItem(label = "Execução", value = "${timerState.config.work}s", color = ElectricLime)
        IntervalInfoItem(label = "Descanso", value = "${timerState.config.rest}s", color = EmberOrange)
        IntervalInfoItem(label = "Rounds", value = "${timerState.config.rounds}", color = TextPrimary)
        IntervalInfoItem(label = "Séries", value = "${timerState.config.sets}", color = Color(0xFF58A6FF))
      }
    }

    Spacer(modifier = Modifier.weight(1f))

    // Interactive Action Controls (Reset, Big Play/Pause, Skip)
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(bottom = 16.dp),
      horizontalArrangement = Arrangement.SpaceEvenly,
      verticalAlignment = Alignment.CenterVertically
    ) {
      // Reset Button
      IconButton(
        onClick = onReset,
        modifier = Modifier
          .size(54.dp)
          .clip(CircleShape)
          .background(ObsidianSurface)
          .border(1.dp, ObsidianBorder, CircleShape)
      ) {
        Icon(imageVector = Icons.AutoMirrored.Filled.RotateLeft, contentDescription = "Reiniciar", tint = TextSecondary, modifier = Modifier.size(26.dp))
      }

      // Play / Pause Main Action Button
      Button(
        onClick = onToggleRun,
        colors = ButtonDefaults.buttonColors(
          containerColor = if (timerState.isRunning) EmberOrange else ElectricLime,
          contentColor = ObsidianBg
        ),
        shape = CircleShape,
        modifier = Modifier.size(80.dp)
      ) {
        Icon(
          imageVector = if (timerState.isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
          contentDescription = if (timerState.isRunning) "Pausar" else "Iniciar",
          modifier = Modifier.size(40.dp)
        )
      }

      // Skip Phase Button
      IconButton(
        onClick = onSkip,
        modifier = Modifier
          .size(54.dp)
          .clip(CircleShape)
          .background(ObsidianSurface)
          .border(1.dp, ObsidianBorder, CircleShape)
      ) {
        Icon(imageVector = Icons.Default.SkipNext, contentDescription = "Pular Fase", tint = TextSecondary, modifier = Modifier.size(26.dp))
      }
    }
  }
}

@Composable
private fun IntervalInfoItem(label: String, value: String, color: Color) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(text = value, color = color, fontWeight = FontWeight.Black, fontSize = 16.sp)
    Text(text = label, color = TextMuted, fontSize = 11.sp)
  }
}
