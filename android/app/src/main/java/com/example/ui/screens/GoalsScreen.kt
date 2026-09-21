package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.model.Goal
import com.example.model.GoalCategory
import com.example.ui.theme.*

@Composable
fun GoalsScreen(
  goals: List<Goal>,
  lastRewardedGoal: Goal?,
  onIncrementGoal: (String, Int) -> Unit,
  onClaimReward: (String) -> Unit,
  onDismissReward: () -> Unit,
  onAddNewGoal: (String, Int, String, GoalCategory, String, Int) -> Unit
) {
  var showCompletedOnly by remember { mutableStateOf(false) }
  var showAddGoalDialog by remember { mutableStateOf(false) }

  val activeGoals = remember(goals) { goals.filter { !it.isCompleted } }
  val completedGoals = remember(goals) { goals.filter { it.isCompleted } }
  val displayedGoals = if (showCompletedOnly) completedGoals else activeGoals

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg)
      .padding(horizontal = 16.dp)
  ) {
    // Header
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(top = 16.dp, bottom = 4.dp),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column {
        Text(
          text = "Metas & Progressão",
          color = TextPrimary,
          fontSize = 24.sp,
          fontWeight = FontWeight.Black
        )
        Text(
          text = "Rascunhos locais. Não salvos e sem recompensas.",
          color = TextSecondary,
          fontSize = 13.sp
        )
      }

      IconButton(
        onClick = { showAddGoalDialog = true },
        modifier = Modifier
          .size(44.dp)
          .clip(CircleShape)
          .background(ElectricLime)
      ) {
        Icon(imageVector = Icons.Default.Add, contentDescription = "Nova Meta", tint = ObsidianBg)
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Goals Metric Banner
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
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = "${activeGoals.size}", color = ElectricLime, fontSize = 22.sp, fontWeight = FontWeight.Black)
          Text(text = "Em Andamento", color = TextSecondary, fontSize = 11.sp)
        }
        Box(
          modifier = Modifier
            .width(1.dp)
            .height(36.dp)
            .background(ObsidianBorder)
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = "${completedGoals.size}", color = WarningGold, fontSize = 22.sp, fontWeight = FontWeight.Black)
          Text(text = "Concluídas", color = TextSecondary, fontSize = 11.sp)
        }
        Box(
          modifier = Modifier
            .width(1.dp)
            .height(36.dp)
            .background(ObsidianBorder)
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          val totalXp = completedGoals.sumOf { it.xpReward }
          Text(text = "+$totalXp", color = Color(0xFF58A6FF), fontSize = 22.sp, fontWeight = FontWeight.Black)
          Text(text = "XP indisponível", color = TextSecondary, fontSize = 11.sp)
        }
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Filter Tabs (Ativas / Concluídas)
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .background(ObsidianSurface)
        .padding(4.dp)
    ) {
      Box(
        modifier = Modifier
          .weight(1f)
          .clip(RoundedCornerShape(10.dp))
          .background(if (!showCompletedOnly) ElectricLime else Color.Transparent)
          .clickable { showCompletedOnly = false }
          .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
      ) {
        Text(
          text = "Ativas (${activeGoals.size})",
          color = if (!showCompletedOnly) ObsidianBg else TextSecondary,
          fontWeight = FontWeight.Bold,
          fontSize = 13.sp
        )
      }

      Box(
        modifier = Modifier
          .weight(1f)
          .clip(RoundedCornerShape(10.dp))
          .background(if (showCompletedOnly) ElectricLime else Color.Transparent)
          .clickable { showCompletedOnly = true }
          .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
      ) {
        Text(
          text = "Concluídas (${completedGoals.size})",
          color = if (showCompletedOnly) ObsidianBg else TextSecondary,
          fontWeight = FontWeight.Bold,
          fontSize = 13.sp
        )
      }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Goals List
    LazyColumn(
      verticalArrangement = Arrangement.spacedBy(12.dp),
      contentPadding = PaddingValues(bottom = 32.dp),
      modifier = Modifier.fillMaxSize()
    ) {
      if (displayedGoals.isEmpty()) {
        item {
          Box(
            modifier = Modifier
              .fillMaxWidth()
              .padding(vertical = 40.dp),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = if (showCompletedOnly) "Nenhuma meta concluída ainda. Continue treinando!" else "Nenhuma meta ativa. Crie uma nova acima!",
              color = TextMuted,
              fontSize = 14.sp
            )
          }
        }
      } else {
        items(displayedGoals) { goal ->
          GoalCard(
            goal = goal,
            onIncrement = { onIncrementGoal(goal.id, 1) },
            onClaim = { onClaimReward(goal.id) }
          )
        }
      }
    }
  }

  // Add Goal Modal Dialog
  if (showAddGoalDialog) {
    AddGoalDialog(
      onDismiss = { showAddGoalDialog = false },
      onAdd = { title, target, unit, category, deadline, xp ->
        onAddNewGoal(title, target, unit, category, deadline, xp)
        showAddGoalDialog = false
      }
    )
  }

  // Reward Claimed Celebration Dialog
  lastRewardedGoal?.let { goal ->
    RewardCelebrationDialog(
      goal = goal,
      onDismiss = onDismissReward
    )
  }
}

@Composable
private fun GoalCard(
  goal: Goal,
  onIncrement: () -> Unit,
  onClaim: () -> Unit
) {
  val isReached = goal.current >= goal.target
  val progress = (goal.current.toFloat() / goal.target.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)

  Card(
    shape = RoundedCornerShape(18.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(
      width = if (goal.isCompleted) 1.5.dp else 1.dp,
      color = if (goal.isCompleted) WarningGold else ObsidianBorder
    ),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(16.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(6.dp))
              .background(ObsidianSurfaceElevated)
              .padding(horizontal = 8.dp, vertical = 2.dp)
          ) {
            Text(
              text = goal.category.label.uppercase(),
              color = ElectricLime,
              fontWeight = FontWeight.Bold,
              fontSize = 10.sp
            )
          }
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = "Prazo: ${goal.deadline}",
            color = TextMuted,
            fontSize = 11.sp
          )
        }

        Text(
          text = "Sem recompensa",
          color = WarningGold,
          fontWeight = FontWeight.Bold,
          fontSize = 12.sp
        )
      }

      Spacer(modifier = Modifier.height(8.dp))

      Text(
        text = goal.title,
        color = TextPrimary,
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp
      )

      Spacer(modifier = Modifier.height(10.dp))

      LinearProgressIndicator(
        progress = { progress },
        color = if (isReached) WarningGold else ElectricLime,
        trackColor = ObsidianSurfaceElevated,
        modifier = Modifier
          .fillMaxWidth()
          .height(8.dp)
          .clip(RoundedCornerShape(4.dp))
      )

      Spacer(modifier = Modifier.height(8.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          text = "${goal.current} / ${goal.target} ${goal.unit}",
          color = TextSecondary,
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold
        )

        if (goal.isCompleted) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = WarningGold, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(text = "Concluída", color = WarningGold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
          }
        } else if (isReached) {
          Button(
            onClick = onClaim,
            colors = ButtonDefaults.buttonColors(containerColor = WarningGold, contentColor = ObsidianBg),
            shape = RoundedCornerShape(10.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
          ) {
            Icon(imageVector = Icons.Default.EmojiEvents, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text("Recompensas indisponíveis", fontWeight = FontWeight.Black, fontSize = 12.sp)
          }
        } else {
          OutlinedButton(
            onClick = onIncrement,
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
            border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
          ) {
            Text("+1 ${goal.unit.take(4)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
          }
        }
      }
    }
  }
}

@Composable
private fun AddGoalDialog(
  onDismiss: () -> Unit,
  onAdd: (String, Int, String, GoalCategory, String, Int) -> Unit
) {
  var title by remember { mutableStateOf("") }
  var targetStr by remember { mutableStateOf("") }
  var unit by remember { mutableStateOf("reps") }
  var category by remember { mutableStateOf(GoalCategory.FORCA) }
  var deadline by remember { mutableStateOf("4 semanas") }
  var xpRewardStr by remember { mutableStateOf("200") }

  Dialog(onDismissRequest = onDismiss) {
    Card(
      shape = RoundedCornerShape(24.dp),
      colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
      border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp)
    ) {
      Column(modifier = Modifier.padding(20.dp)) {
        Text(
          text = "Criar Nova Meta",
          color = TextPrimary,
          fontSize = 18.sp,
          fontWeight = FontWeight.Black
        )

        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
          value = title,
          onValueChange = { title = it },
          label = { Text("Nome da Meta (Ex: 15 Barras Estritas)") },
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = ElectricLime,
            unfocusedBorderColor = ObsidianBorder,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary
          ),
          modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          OutlinedTextField(
            value = targetStr,
            onValueChange = { targetStr = it },
            label = { Text("Alvo") },
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.weight(1f)
          )
          OutlinedTextField(
            value = unit,
            onValueChange = { unit = it },
            label = { Text("Unidade (reps, s)") },
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.weight(1f)
          )
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
          value = deadline,
          onValueChange = { deadline = it },
          label = { Text("Prazo Estimado") },
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = ElectricLime,
            unfocusedBorderColor = ObsidianBorder,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary
          ),
          modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(18.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          OutlinedButton(
            onClick = onDismiss,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.weight(1f)
          ) {
            Text("Cancelar", color = TextSecondary)
          }

          Button(
            onClick = {
              val target = targetStr.toIntOrNull() ?: 10
              val xp = xpRewardStr.toIntOrNull() ?: 200
              if (title.isNotBlank()) {
                onAdd(title, target, unit, category, deadline, xp)
              }
            },
            colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.weight(1f)
          ) {
            Text("Salvar Meta", fontWeight = FontWeight.Bold)
          }
        }
      }
    }
  }
}

@Composable
private fun RewardCelebrationDialog(
  goal: Goal,
  onDismiss: () -> Unit
) {
  Dialog(onDismissRequest = onDismiss) {
    Card(
      shape = RoundedCornerShape(24.dp),
      colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
      border = androidx.compose.foundation.BorderStroke(2.dp, WarningGold),
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
            .background(WarningGold.copy(alpha = 0.2f))
            .border(2.dp, WarningGold, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(
            imageVector = Icons.Default.EmojiEvents,
            contentDescription = null,
            tint = WarningGold,
            modifier = Modifier.size(42.dp)
          )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
          text = "META CONQUISTADA!",
          color = TextPrimary,
          fontSize = 20.sp,
          fontWeight = FontWeight.Black
        )

        Text(
          text = goal.title,
          color = ElectricLime,
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
          text = "Sem recompensa",
          color = WarningGold,
          fontSize = 32.sp,
          fontWeight = FontWeight.Black
        )
        Text(
          text = "Adicionado ao seu perfil de atleta!",
          color = TextSecondary,
          fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(
          onClick = onDismiss,
          colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
          shape = RoundedCornerShape(14.dp),
          modifier = Modifier.fillMaxWidth()
        ) {
          Text("Continuar", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
      }
    }
  }
}
