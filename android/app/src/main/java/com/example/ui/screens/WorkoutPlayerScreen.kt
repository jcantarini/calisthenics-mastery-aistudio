package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.*
import com.example.ui.viewmodel.ActiveWorkoutSessionState

@Composable
fun WorkoutPlayerScreen(
  session: ActiveWorkoutSessionState,
  onCompleteSet: () -> Unit,
  onSkipRest: () -> Unit,
  onFinishWorkout: () -> Unit,
  onClose: () -> Unit
) {
  val exercise = session.program.exercises.getOrNull(session.currentExerciseIndex)

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg)
  ) {
    if (session.isFinished) {
      WorkoutFinishedDialog(
        session = session,
        onDismiss = onClose
      )
    } else if (exercise != null) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        // Top Bar
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          IconButton(
            onClick = onClose,
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(ObsidianSurface)
          ) {
            Icon(imageVector = Icons.Default.Close, contentDescription = "Sair", tint = TextSecondary)
          }

          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
              text = session.program.title.uppercase(),
              color = ElectricLime,
              fontSize = 12.sp,
              fontWeight = FontWeight.Black
            )
            val minutes = session.elapsedSeconds / 60
            val seconds = session.elapsedSeconds % 60
            Text(
              text = "%02d:%02d".format(minutes, seconds),
              color = TextPrimary,
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold
            )
          }

          TextButton(onClick = onFinishWorkout) {
            Text("Finalizar", color = EmberOrange, fontWeight = FontWeight.Bold)
          }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Exercise Progress Indicator
        val progress = (session.currentExerciseIndex + 1).toFloat() / session.program.exercises.size.toFloat()
        LinearProgressIndicator(
          progress = { progress },
          color = ElectricLime,
          trackColor = ObsidianSurfaceElevated,
          modifier = Modifier
            .fillMaxWidth()
            .height(6.dp)
            .clip(RoundedCornerShape(3.dp))
        )

        Spacer(modifier = Modifier.height(10.dp))

        Text(
          text = "Exercício ${session.currentExerciseIndex + 1} de ${session.program.exercises.size}",
          color = TextSecondary,
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Big Exercise Card
        Card(
          shape = RoundedCornerShape(24.dp),
          colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
          border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
          ) {
            Box(
              modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(ElectricLime.copy(alpha = 0.15f))
                .border(2.dp, ElectricLime, CircleShape),
              contentAlignment = Alignment.Center
            ) {
              Icon(
                imageVector = Icons.Default.FitnessCenter,
                contentDescription = null,
                tint = ElectricLime,
                modifier = Modifier.size(32.dp)
              )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
              text = exercise.name,
              color = TextPrimary,
              fontSize = 24.sp,
              fontWeight = FontWeight.Black,
              textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Box(
              modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(ObsidianSurfaceElevated)
                .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
              Text(
                text = exercise.focus,
                color = ElectricLime,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
              )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Prescribed sets and reps
            Text(
              text = exercise.sets,
              color = TextPrimary,
              fontSize = 28.sp,
              fontWeight = FontWeight.Black
            )
            Text(
              text = "Descanso planejado: ${exercise.rest}",
              color = TextSecondary,
              fontSize = 13.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Coach postural cue
            Box(
              modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(ObsidianSurfaceElevated)
                .border(1.dp, ObsidianBorder, RoundedCornerShape(14.dp))
                .padding(12.dp)
            ) {
              Row(verticalAlignment = Alignment.Top) {
                Icon(
                  imageVector = Icons.Default.TipsAndUpdates,
                  contentDescription = null,
                  tint = WarningGold,
                  modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                  text = exercise.cue,
                  color = TextPrimary,
                  fontSize = 13.sp,
                  lineHeight = 18.sp
                )
              }
            }
          }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Rest Mode Overlay or Normal Set Action
        if (session.isResting) {
          RestCountdownCard(
            secondsRemaining = session.restSecondsRemaining,
            onSkip = onSkipRest
          )
        } else {
          Button(
            onClick = onCompleteSet,
            colors = ButtonDefaults.buttonColors(
              containerColor = ElectricLime,
              contentColor = ObsidianBg
            ),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
              .fillMaxWidth()
              .height(58.dp)
          ) {
            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Text(
              text = "Concluir Série (${session.completedSetsForCurrent + 1})",
              fontWeight = FontWeight.Black,
              fontSize = 16.sp
            )
          }
        }

        Spacer(modifier = Modifier.height(16.dp))
      }
    }
  }
}

@Composable
private fun RestCountdownCard(
  secondsRemaining: Int,
  onSkip: () -> Unit
) {
  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurfaceElevated),
    border = androidx.compose.foundation.BorderStroke(1.5.dp, EmberOrange),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(
      modifier = Modifier.padding(16.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(imageVector = Icons.Default.Timer, contentDescription = null, tint = EmberOrange, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = "DESCANSO ENTRE SÉRIES", color = EmberOrange, fontWeight = FontWeight.Black, fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(8.dp))

      Text(
        text = "${secondsRemaining}s",
        color = TextPrimary,
        fontSize = 40.sp,
        fontWeight = FontWeight.Black
      )

      Spacer(modifier = Modifier.height(10.dp))

      OutlinedButton(
        onClick = onSkip,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
        border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder)
      ) {
        Text("Pular Descanso e Continuar", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
      }
    }
  }
}

@Composable
private fun WorkoutFinishedDialog(
  session: ActiveWorkoutSessionState,
  onDismiss: () -> Unit
) {
  Dialog(onDismissRequest = onDismiss) {
    Card(
      shape = RoundedCornerShape(28.dp),
      colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
      border = androidx.compose.foundation.BorderStroke(2.dp, ElectricLime),
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp)
    ) {
      Column(
        modifier = Modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        Box(
          modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(ElectricLime.copy(alpha = 0.2f))
            .border(2.dp, ElectricLime, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = Icons.Default.EmojiEvents,
            contentDescription = null,
            tint = ElectricLime,
            modifier = Modifier.size(40.dp)
          )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
          text = "SESSÃO ENCERRADA",
          color = TextPrimary,
          fontSize = 22.sp,
          fontWeight = FontWeight.Black
        )

        Text(
          text = session.program.title,
          color = ElectricLime,
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(20.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceAround
        ) {
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "—", color = WarningGold, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(text = "Sem recompensa", color = TextSecondary, fontSize = 12.sp)
          }
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            val mins = session.elapsedSeconds / 60
            Text(text = "${mins}m", color = ElectricLime, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(text = "Duração", color = TextSecondary, fontSize = 12.sp)
          }
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "—", color = EmberOrange, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(text = "Não calculadas", color = TextSecondary, fontSize = 12.sp)
          }
        }

        Text("Esta sessão não foi salva. Histórico e recompensas indisponíveis.", color = TextSecondary)
        Spacer(modifier = Modifier.height(24.dp))

        Button(
          onClick = onDismiss,
          colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
          shape = RoundedCornerShape(14.dp),
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
        ) {
          Text(text = "Continuar Evoluindo", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
      }
    }
  }
}
