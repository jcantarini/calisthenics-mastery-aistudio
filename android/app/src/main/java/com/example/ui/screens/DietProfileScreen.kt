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
import androidx.compose.material.icons.automirrored.filled.RotateLeft
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
import com.example.data.CalisthenicsAppState
import com.example.data.SupabaseCloudStatus
import com.example.model.ActivityLevel
import com.example.model.Sex
import com.example.ui.theme.*
import com.example.ui.viewmodel.NutritionRecommendation

@Composable
fun DietProfileScreen(
  state: CalisthenicsAppState,
  nutrition: NutritionRecommendation,
  supabaseStatus: SupabaseCloudStatus = SupabaseCloudStatus(),
  onSyncSupabase: () -> Unit = {},
  onAddWater: (Int) -> Unit,
  onResetWater: () -> Unit,
  onUpdateProfile: (String, Float, Int, Int, ActivityLevel, Sex) -> Unit,
  onSignOut: () -> Unit
) {
  var showEditProfileDialog by remember { mutableStateOf(false) }

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg),
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(18.dp)
  ) {
    // Supabase Cloud Integration Card
    item {
      SupabaseCloudCard(
        status = supabaseStatus,
        onSync = onSyncSupabase
      )
    }

    // Screen Title
    item {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(
            text = "Nutrição & Atleta",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black
          )
          Text(
            text = "Combustível para performance e recuperação muscular",
            color = TextSecondary,
            fontSize = 13.sp
          )
        }

        IconButton(
          onClick = { showEditProfileDialog = true },
          modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(ObsidianSurface)
            .border(1.dp, ObsidianBorder, CircleShape)
        ) {
          Icon(imageVector = Icons.Default.Edit, contentDescription = "Editar Perfil", tint = TextSecondary, modifier = Modifier.size(18.dp))
        }
      }
    }

    // Hydration Tracker Card
    item {
      HydrationCard(
        consumedMl = state.waterConsumedMl,
        targetMl = state.waterTargetMl,
        onAdd = onAddWater,
        onReset = onResetWater
      )
    }

    // Caloric & Macronutrient Needs for Calisthenics
    item {
      NutritionCard(nutrition = nutrition, weightKg = state.profile.weightKg)
    }

    // Athlete Bio & Physical Stats
    item {
      AthleteProfileSummaryCard(
        state = state,
        onEdit = { showEditProfileDialog = true },
        onSignOut = onSignOut
      )
    }

    // Achievements Showcase
    item {
      AchievementsList(state = state)
    }
  }

  // Edit Profile Dialog
  if (showEditProfileDialog) {
    EditProfileDialog(
      state = state,
      onDismiss = { showEditProfileDialog = false },
      onSave = { name, weight, height, birthYear, activity, sex ->
        onUpdateProfile(name, weight, height, birthYear, activity, sex)
        showEditProfileDialog = false
      }
    )
  }
}

@Composable
private fun HydrationCard(
  consumedMl: Int,
  targetMl: Int,
  onAdd: (Int) -> Unit,
  onReset: () -> Unit
) {
  val waterProgress = (consumedMl.toFloat() / targetMl.toFloat()).coerceIn(0f, 1f)

  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF58A6FF).copy(alpha = 0.3f)),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(18.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFF58A6FF).copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
          ) {
            Icon(imageVector = Icons.Default.WaterDrop, contentDescription = null, tint = Color(0xFF58A6FF), modifier = Modifier.size(20.dp))
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(text = "Hidratação Diária", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(text = "Essencial para flexibilidade e articulações", color = TextSecondary, fontSize = 11.sp)
          }
        }

        Text(
          text = "$consumedMl / $targetMl ml",
          color = Color(0xFF58A6FF),
          fontWeight = FontWeight.Black,
          fontSize = 14.sp
        )
      }

      Spacer(modifier = Modifier.height(14.dp))

      LinearProgressIndicator(
        progress = { waterProgress },
        color = Color(0xFF58A6FF),
        trackColor = ObsidianSurfaceElevated,
        modifier = Modifier
          .fillMaxWidth()
          .height(10.dp)
          .clip(RoundedCornerShape(5.dp))
      )

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        OutlinedButton(
          onClick = { onAdd(250) },
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF58A6FF)),
          border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
          modifier = Modifier.weight(1f)
        ) {
          Text("+250ml", fontWeight = FontWeight.Bold, fontSize = 12.sp)
        }

        OutlinedButton(
          onClick = { onAdd(500) },
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF58A6FF)),
          border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
          modifier = Modifier.weight(1f)
        ) {
          Text("+500ml", fontWeight = FontWeight.Bold, fontSize = 12.sp)
        }

        IconButton(
          onClick = onReset,
          modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(ObsidianSurfaceElevated)
        ) {
          Icon(imageVector = Icons.AutoMirrored.Filled.RotateLeft, contentDescription = "Zerar Água", tint = TextMuted)
        }
      }
    }
  }
}

@Composable
private fun NutritionCard(
  nutrition: NutritionRecommendation,
  weightKg: Float
) {
  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(18.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(text = "Metas de Macronutrientes", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
          Text(text = "Otimizado para força peso corporal", color = TextSecondary, fontSize = 11.sp)
        }

        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(ElectricLime)
            .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
          Text(
            text = "${nutrition.dailyCalories} kcal",
            color = ObsidianBg,
            fontWeight = FontWeight.Black,
            fontSize = 12.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
      ) {
        MacroCardItem(
          label = "Proteínas",
          amount = "${nutrition.proteinGrams}g",
          desc = "2.0g/kg",
          color = ElectricLime,
          modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        MacroCardItem(
          label = "Carboidratos",
          amount = "${nutrition.carbsGrams}g",
          desc = "Explosão",
          color = WarningGold,
          modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        MacroCardItem(
          label = "Gorduras",
          amount = "${nutrition.fatGrams}g",
          desc = "Articulações",
          color = EmberOrange,
          modifier = Modifier.weight(1f)
        )
      }

      Spacer(modifier = Modifier.height(14.dp))

      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(12.dp))
          .background(ObsidianSurfaceElevated)
          .padding(12.dp)
      ) {
        Text(
          text = "💡 Dica de Calistenia: Mantenha ingestão adequada de proteína distribuída em 4 refeições diárias e consuma carboidratos complexos 90 minutos antes do treino na barra para evitar fadiga no core.",
          color = TextSecondary,
          fontSize = 12.sp,
          lineHeight = 16.sp
        )
      }
    }
  }
}

@Composable
private fun MacroCardItem(
  label: String,
  amount: String,
  desc: String,
  color: Color,
  modifier: Modifier = Modifier
) {
  Box(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .background(ObsidianSurfaceElevated)
      .border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
      .padding(12.dp)
  ) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
      Text(text = label, color = TextSecondary, fontSize = 11.sp)
      Spacer(modifier = Modifier.height(4.dp))
      Text(text = amount, color = color, fontSize = 18.sp, fontWeight = FontWeight.Black)
      Text(text = desc, color = TextMuted, fontSize = 10.sp)
    }
  }
}

@Composable
private fun AthleteProfileSummaryCard(
  state: CalisthenicsAppState,
  onEdit: () -> Unit,
  onSignOut: () -> Unit
) {
  val profile = state.profile
  val user = state.currentUser

  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(18.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(text = "Ficha do Atleta", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
          if (user != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              if (!user.isGuest) {
                Box(
                  modifier = Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                  contentAlignment = Alignment.Center
                ) {
                  Text("G", color = Color(0xFF4285F4), fontSize = 10.sp, fontWeight = FontWeight.Black)
                }
                Spacer(modifier = Modifier.width(5.dp))
              }
              Text(
                text = if (user.isGuest) "Modo Convidado" else user.email,
                color = if (user.isGuest) TextSecondary else Color(0xFF58A6FF),
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
              )
            }
          }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(text = "Editar", color = ElectricLime, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { onEdit() })
          Spacer(modifier = Modifier.width(16.dp))
          Text(text = "Sair", color = ErrorRed, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { onSignOut() })
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceAround
      ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = "${profile.weightKg} kg", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
          Text(text = "Peso", color = TextMuted, fontSize = 12.sp)
        }
        Box(modifier = Modifier.width(1.dp).height(30.dp).background(ObsidianBorder))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = "${profile.heightCm} cm", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
          Text(text = "Altura", color = TextMuted, fontSize = 12.sp)
        }
        Box(modifier = Modifier.width(1.dp).height(30.dp).background(ObsidianBorder))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = profile.activityLevel.label, color = ElectricLime, fontWeight = FontWeight.Bold, fontSize = 14.sp)
          Text(text = "Nível", color = TextMuted, fontSize = 12.sp)
        }
      }
    }
  }
}

@Composable
private fun AchievementsList(state: CalisthenicsAppState) {
  Column {
    Text(
      text = "Sala de Conquistas",
      color = TextPrimary,
      fontWeight = FontWeight.Bold,
      fontSize = 16.sp,
      modifier = Modifier.padding(bottom = 12.dp)
    )

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
      state.achievements.forEach { achievement ->
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(ObsidianSurface)
            .border(
              1.dp,
              if (achievement.isUnlocked) WarningGold.copy(alpha = 0.4f) else ObsidianBorder,
              RoundedCornerShape(14.dp)
            )
            .padding(14.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(if (achievement.isUnlocked) WarningGold.copy(alpha = 0.2f) else ObsidianSurfaceElevated),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = if (achievement.isUnlocked) Icons.Default.EmojiEvents else Icons.Default.Lock,
              contentDescription = null,
              tint = if (achievement.isUnlocked) WarningGold else TextMuted,
              modifier = Modifier.size(20.dp)
            )
          }

          Spacer(modifier = Modifier.width(12.dp))

          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = achievement.title,
              color = if (achievement.isUnlocked) TextPrimary else TextSecondary,
              fontWeight = FontWeight.Bold,
              fontSize = 14.sp
            )
            Text(
              text = achievement.description,
              color = TextMuted,
              fontSize = 12.sp
            )
          }

          Text(
            text = "+${achievement.xpReward} XP",
            color = if (achievement.isUnlocked) WarningGold else TextMuted,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp
          )
        }
      }
    }
  }
}

@Composable
private fun EditProfileDialog(
  state: CalisthenicsAppState,
  onDismiss: () -> Unit,
  onSave: (String, Float, Int, Int, ActivityLevel, Sex) -> Unit
) {
  var name by remember { mutableStateOf(state.profile.name) }
  var weightStr by remember { mutableStateOf(state.profile.weightKg.toString()) }
  var heightStr by remember { mutableStateOf(state.profile.heightCm.toString()) }
  var birthYearStr by remember { mutableStateOf(state.profile.birthYear.toString()) }
  var activityLevel by remember { mutableStateOf(state.profile.activityLevel) }
  var sex by remember { mutableStateOf(state.profile.sex) }

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
        Text(text = "Editar Perfil do Atleta", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 18.sp)

        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
          value = name,
          onValueChange = { name = it },
          label = { Text("Nome do Atleta") },
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
            value = weightStr,
            onValueChange = { weightStr = it },
            label = { Text("Peso (kg)") },
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.weight(1f)
          )
          OutlinedTextField(
            value = heightStr,
            onValueChange = { heightStr = it },
            label = { Text("Altura (cm)") },
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier.weight(1f)
          )
        }

        Spacer(modifier = Modifier.height(18.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) {
            Text("Cancelar", color = TextSecondary)
          }

          Button(
            onClick = {
              val w = weightStr.toFloatOrNull() ?: 72f
              val h = heightStr.toIntOrNull() ?: 175
              val b = birthYearStr.toIntOrNull() ?: 1998
              onSave(name, w, h, b, activityLevel, sex)
            },
            colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.weight(1f)
          ) {
            Text("Salvar", fontWeight = FontWeight.Bold)
          }
        }
      }
    }
  }
}

@Composable
fun SupabaseCloudCard(
  status: SupabaseCloudStatus,
  onSync: () -> Unit
) {
  Card(
    shape = RoundedCornerShape(18.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(1.dp, ElectricLime.copy(alpha = 0.35f)),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .size(36.dp)
              .clip(CircleShape)
              .background(Color(0xFF3ECF8E).copy(alpha = 0.15f))
              .border(1.dp, Color(0xFF3ECF8E), CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = Icons.Default.CloudDone,
              contentDescription = "Supabase Cloud",
              tint = Color(0xFF3ECF8E),
              modifier = Modifier.size(20.dp)
            )
          }

          Spacer(modifier = Modifier.width(10.dp))

          Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text(
                text = "Supabase Conectado",
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
              )
              Spacer(modifier = Modifier.width(6.dp))
              Box(
                modifier = Modifier
                  .clip(RoundedCornerShape(4.dp))
                  .background(Color(0xFF3ECF8E).copy(alpha = 0.2f))
                  .padding(horizontal = 6.dp, vertical = 2.dp)
              ) {
                Text(
                  text = "ONLINE",
                  color = Color(0xFF3ECF8E),
                  fontWeight = FontWeight.Black,
                  fontSize = 9.sp
                )
              }
            }
            Text(
              text = "Base do Lovable (26 tabelas ativas)",
              color = TextSecondary,
              fontSize = 12.sp
            )
          }
        }

        Button(
          onClick = onSync,
          enabled = !status.isSyncing,
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF3ECF8E).copy(alpha = 0.18f),
            contentColor = Color(0xFF3ECF8E)
          ),
          shape = RoundedCornerShape(10.dp),
          contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
        ) {
          if (status.isSyncing) {
            CircularProgressIndicator(
              modifier = Modifier.size(14.dp),
              color = Color(0xFF3ECF8E),
              strokeWidth = 2.dp
            )
          } else {
            Icon(
              imageVector = Icons.Default.Sync,
              contentDescription = "Sincronizar",
              modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = "Sincronizar",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(8.dp))
          .background(ObsidianSurfaceElevated)
          .padding(horizontal = 10.dp, vertical = 7.dp)
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = status.lastSyncMessage ?: "Sincronizado com o Lovable",
            color = TextMuted,
            fontSize = 11.sp,
            maxLines = 1
          )
          Text(
            text = "togglhjhpkccrvxejhup",
            color = TextMuted,
            fontSize = 10.sp
          )
        }
      }
    }
  }
}

