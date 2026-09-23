package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.CalisthenicsAppState
import com.example.model.Program
import com.example.ui.theme.*
import com.example.ui.viewmodel.AppNavTab

@Composable
fun DashboardScreen(
  state: CalisthenicsAppState,
  onStartWorkout: (Program) -> Unit,
  onNavigateTab: (AppNavTab) -> Unit
) {
  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg),
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(20.dp)
  ) {
    // Header with Profile & Streak
    item {
      DashboardHeader(state = state)
    }

    // Hero Banner with Image
    item {
      DashboardHeroBanner(
        activeProgram = state.activeProgram,
        onStart = { onStartWorkout(state.activeProgram) }
      )
    }

    // Weekly Consistency Tracker
    item {
      WeeklyConsistencyCard(streakDays = state.streakDays)
    }

    // Quick Actions
    item {
      QuickActionsGrid(onNavigate = onNavigateTab)
    }

    // Activity Stats Card
    item {
      ActivityStatsCard(state = state)
    }

    // Active Goals Preview
    item {
      ActiveGoalsSpotlight(
        state = state,
        onViewAll = { onNavigateTab(AppNavTab.METAS) }
      )
    }
  }
}

@Composable
private fun DashboardHeader(state: CalisthenicsAppState) {
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
  ) {
    Row(verticalAlignment = Alignment.CenterVertically) {
      Box(
        modifier = Modifier
          .size(46.dp)
          .clip(CircleShape)
          .background(ElectricLime.copy(alpha = 0.15f))
          .border(1.5.dp, ElectricLime, CircleShape),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          imageVector = Icons.Default.FitnessCenter,
          contentDescription = "Perfil",
          tint = ElectricLime,
          modifier = Modifier.size(24.dp)
        )
      }
      Spacer(modifier = Modifier.width(12.dp))
      Column {
        Text(
          text = "Olá, ${state.profile.name}",
          color = TextPrimary,
          fontSize = 18.sp,
          fontWeight = FontWeight.Bold
        )
        Text(
          text = "Nível ${state.currentLevel} • ${state.currentXp} XP",
          color = ElectricLime,
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold
        )
      }
    }

    // Streak Pill
    Row(
      modifier = Modifier
        .clip(RoundedCornerShape(20.dp))
        .background(EmberOrange.copy(alpha = 0.15f))
        .border(1.dp, EmberOrange.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
        .padding(horizontal = 12.dp, vertical = 6.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Icon(
        imageVector = Icons.Default.LocalFireDepartment,
        contentDescription = "Streak",
        tint = EmberOrange,
        modifier = Modifier.size(18.dp)
      )
      Spacer(modifier = Modifier.width(4.dp))
      Text(
        text = "${state.streakDays} dias",
        color = EmberOrange,
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp
      )
    }
  }
}

@Composable
private fun DashboardHeroBanner(
  activeProgram: Program,
  onStart: () -> Unit
) {
  Box(
    modifier = Modifier
      .fillMaxWidth()
      .height(210.dp)
      .clip(RoundedCornerShape(24.dp))
      .border(1.dp, ObsidianBorder, RoundedCornerShape(24.dp))
  ) {
    Image(
      painter = painterResource(id = R.drawable.img_hero_calisthenics),
      contentDescription = "Calistenia Treino",
      contentScale = ContentScale.Crop,
      modifier = Modifier.fillMaxSize()
    )

    // Dark Gradient Overlay
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors = listOf(
              Color.Transparent,
              ObsidianBg.copy(alpha = 0.7f),
              ObsidianBg.copy(alpha = 0.95f)
            )
          )
        )
    )

    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(18.dp),
      verticalArrangement = Arrangement.Bottom
    ) {
      Row(
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(ElectricLime)
            .padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
          Text(
            text = "TREINO DE HOJE",
            color = ObsidianBg,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 11.sp
          )
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          text = "${activeProgram.duration} • ${activeProgram.exercises.size} exercícios",
          color = TextSecondary,
          fontSize = 12.sp
        )
      }

      Spacer(modifier = Modifier.height(6.dp))

      Text(
        text = activeProgram.title,
        color = TextPrimary,
        fontSize = 22.sp,
        fontWeight = FontWeight.Black
      )

      Text(
        text = activeProgram.tagline,
        color = TextSecondary,
        fontSize = 13.sp,
        maxLines = 1
      )

      Spacer(modifier = Modifier.height(12.dp))

      Button(
        onClick = onStart,
        colors = ButtonDefaults.buttonColors(
          containerColor = ElectricLime,
          contentColor = ObsidianBg
        ),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
          .fillMaxWidth()
          .height(46.dp)
      ) {
        Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = "Iniciar Sessão Agora", fontWeight = FontWeight.Bold, fontSize = 15.sp)
      }
    }
  }
}

@Composable
private fun WeeklyConsistencyCard(streakDays: Int) {
  val days = listOf("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom")
  // Let's mark days active up to streak
  val activeIndex = -1 // Calendar history is unavailable until canonical reads.

  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(16.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          text = "Consistência Semanal",
          color = TextPrimary,
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold
        )
        Text(
          text = "Sem histórico salvo",
          color = TextSecondary,
          fontSize = 12.sp
        )
      }

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        days.forEachIndexed { index, day ->
          val isDone = index <= activeIndex
          val isToday = index == activeIndex

          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
              modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(
                  when {
                    isDone -> ElectricLime
                    else -> ObsidianSurfaceElevated
                  }
                )
                .border(
                  width = if (isToday) 2.dp else 1.dp,
                  color = if (isToday) TextPrimary else ObsidianBorder,
                  shape = CircleShape
                ),
              contentAlignment = Alignment.Center
            ) {
              if (isDone) {
                Icon(
                  imageVector = Icons.Default.Check,
                  contentDescription = null,
                  tint = ObsidianBg,
                  modifier = Modifier.size(20.dp)
                )
              } else {
                Text(
                  text = "${index + 1}",
                  color = TextMuted,
                  fontSize = 12.sp,
                  fontWeight = FontWeight.Bold
                )
              }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = day,
              color = if (isDone) ElectricLime else TextMuted,
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium
            )
          }
        }
      }
    }
  }
}

@Composable
private fun QuickActionsGrid(onNavigate: (AppNavTab) -> Unit) {
  Column {
    Text(
      text = "Acesso Rápido",
      color = TextPrimary,
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.padding(bottom = 12.dp)
    )

    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      QuickActionCard(
        title = "Programas",
        subtitle = "5 Rotinas",
        icon = Icons.Default.SportsGymnastics,
        accentColor = ElectricLime,
        modifier = Modifier.weight(1f),
        onClick = { onNavigate(AppNavTab.PROGRAMAS) }
      )
      QuickActionCard(
        title = "Timer HIIT",
        subtitle = "Tabata & EMOM",
        icon = Icons.Default.Timer,
        accentColor = EmberOrange,
        modifier = Modifier.weight(1f),
        onClick = { onNavigate(AppNavTab.TIMER) }
      )
    }

    Spacer(modifier = Modifier.height(12.dp))

    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      QuickActionCard(
        title = "Metas",
        subtitle = "Progresso & XP",
        icon = Icons.Default.EmojiEvents,
        accentColor = WarningGold,
        modifier = Modifier.weight(1f),
        onClick = { onNavigate(AppNavTab.METAS) }
      )
      QuickActionCard(
        title = "Nutrição",
        subtitle = "Macros & Água",
        icon = Icons.Default.WaterDrop,
        accentColor = Color(0xFF58A6FF),
        modifier = Modifier.weight(1f),
        onClick = { onNavigate(AppNavTab.PERFIL) }
      )
    }
  }
}

@Composable
private fun QuickActionCard(
  title: String,
  subtitle: String,
  icon: androidx.compose.ui.graphics.vector.ImageVector,
  accentColor: Color,
  modifier: Modifier = Modifier,
  onClick: () -> Unit
) {
  Box(
    modifier = modifier
      .height(90.dp)
      .clip(RoundedCornerShape(18.dp))
      .background(ObsidianSurface)
      .border(1.dp, ObsidianBorder, RoundedCornerShape(18.dp))
      .clickable { onClick() }
      .padding(14.dp)
  ) {
    Row(
      modifier = Modifier.fillMaxSize(),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier
          .size(42.dp)
          .clip(RoundedCornerShape(12.dp))
          .background(accentColor.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(imageVector = icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(24.dp))
      }
      Spacer(modifier = Modifier.width(12.dp))
      Column {
        Text(text = title, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(text = subtitle, color = TextSecondary, fontSize = 11.sp)
      }
    }
  }
}

@Composable
private fun ActivityStatsCard(state: CalisthenicsAppState) {
  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(16.dp)) {
      Text(
        text = "Resumo de Atividade",
        color = TextPrimary,
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold
      )

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceAround
      ) {
        StatItem(
          value = "${state.totalWorkoutsCount}",
          label = "Treinos",
          color = ElectricLime
        )
        Box(
          modifier = Modifier
            .width(1.dp)
            .height(40.dp)
            .background(ObsidianBorder)
        )
        StatItem(
          value = "${state.totalMinutesTrained}",
          label = "Minutos",
          color = EmberOrange
        )
        Box(
          modifier = Modifier
            .width(1.dp)
            .height(40.dp)
            .background(ObsidianBorder)
        )
        StatItem(
          value = "${state.totalCaloriesBurned}",
          label = "Kcal",
          color = WarningGold
        )
      }
    }
  }
}

@Composable
private fun StatItem(value: String, label: String, color: Color) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(text = value, color = color, fontSize = 22.sp, fontWeight = FontWeight.Black)
    Text(text = label, color = TextSecondary, fontSize = 12.sp)
  }
}

@Composable
private fun ActiveGoalsSpotlight(
  state: CalisthenicsAppState,
  onViewAll: () -> Unit
) {
  val topGoal = state.goals.firstOrNull { !it.isCompleted } ?: return

  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurfaceElevated),
    border = androidx.compose.foundation.BorderStroke(1.dp, ElectricLime.copy(alpha = 0.3f)),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(16.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(
            imageVector = Icons.Default.Flag,
            contentDescription = null,
            tint = ElectricLime,
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "Meta em Destaque",
            color = ElectricLime,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp
          )
        }
        Text(
          text = "Ver todas",
          color = TextSecondary,
          fontSize = 12.sp,
          fontWeight = FontWeight.SemiBold,
          modifier = Modifier.clickable { onViewAll() }
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      Text(
        text = topGoal.title,
        color = TextPrimary,
        fontWeight = FontWeight.Bold,
        fontSize = 15.sp
      )

      Spacer(modifier = Modifier.height(8.dp))

      val progress = (topGoal.current.toFloat() / topGoal.target.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)
      LinearProgressIndicator(
        progress = { progress },
        color = ElectricLime,
        trackColor = ObsidianBorder,
        modifier = Modifier
          .fillMaxWidth()
          .height(8.dp)
          .clip(RoundedCornerShape(4.dp))
      )

      Spacer(modifier = Modifier.height(6.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        Text(
          text = "${topGoal.current} / ${topGoal.target} ${topGoal.unit}",
          color = TextSecondary,
          fontSize = 12.sp
        )
        Text(
          text = "+${topGoal.xpReward} XP",
          color = WarningGold,
          fontWeight = FontWeight.Bold,
          fontSize = 12.sp
        )
      }
    }
  }
}
