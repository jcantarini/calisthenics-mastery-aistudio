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
import androidx.compose.ui.platform.testTag
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
  // Key dialog state on identity to dismiss and invalidate edit dialog when identity changes
  var showEditProfileDialog by remember(state.currentUser) { mutableStateOf(false) }

  key(state.currentUser) {
    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .background(ObsidianBg)
        .testTag("diet_profile_list"),
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

      // Clear In-Memory Profile Notice
      item {
        if (state.profileConfigured) {
          Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = ObsidianSurfaceElevated),
            border = androidx.compose.foundation.BorderStroke(1.dp, ElectricLime.copy(alpha = 0.35f)),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
              Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = ElectricLime, modifier = Modifier.size(20.dp))
              Spacer(modifier = Modifier.width(10.dp))
              Column {
                Text(
                  text = "Perfil temporário em memória",
                  color = TextPrimary,
                  fontWeight = FontWeight.Bold,
                  fontSize = 13.sp
                )
                Text(
                  text = "Alterações aplicadas apenas nesta sessão local. Não há sincronização com a nuvem e os dados são descartados ao sair.",
                  color = TextSecondary,
                  fontSize = 11.sp
                )
              }
            }
          }
        } else {
          Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = ObsidianSurfaceElevated),
            border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
            modifier = Modifier.fillMaxWidth()
          ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
              Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))
              Spacer(modifier = Modifier.width(10.dp))
              Column {
                Text(
                  text = "Valores padrão de exemplo",
                  color = TextPrimary,
                  fontWeight = FontWeight.Bold,
                  fontSize = 13.sp
                )
                Text(
                  text = "Nenhum perfil foi configurado nesta sessão. As estimativas de calorias, macronutrientes e água usam valores genéricos de exemplo (72 kg, 175 cm).",
                  color = TextSecondary,
                  fontSize = 11.sp
                )
              }
            }
          }
        }
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
              .testTag("edit_profile_button_header")
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
        NutritionCard(nutrition = nutrition, isConfigured = state.profileConfigured)
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
  isConfigured: Boolean
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
          Text(
            text = if (isConfigured) "Otimizado para força e peso corporal" else "Estimativa padrão de exemplo (72 kg, 175 cm)",
            color = if (isConfigured) TextSecondary else WarningGold,
            fontSize = 11.sp
          )
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
          text = if (isConfigured)
            "💡 Dica de Calistenia: Mantenha ingestão adequada de proteína distribuída em 4 refeições diárias e consuma carboidratos complexos 90 minutos antes do treino na barra."
          else
            "💡 Exemplo de Demonstração: Os macronutrientes acima são calculados com base no perfil padrão (72 kg, 175 cm). Configure seu perfil para estimativas desta sessão.",
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
  val isConfigured = state.profileConfigured

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
              Text(
                text = if (user is com.example.data.AuthenticatedUser) "Conta verificada pelo Supabase" else "Modo Convidado",
                color = TextSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
              )
            }
          }
          Text(
            text = if (isConfigured) "Perfil local preenchido" else "Valores de exemplo (não preenchido)",
            color = if (isConfigured) ElectricLime else TextMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold
          )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(
            text = "Editar",
            color = ElectricLime,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
              .clickable { onEdit() }
              .testTag("edit_profile_button")
          )
          Spacer(modifier = Modifier.width(16.dp))
          Text(
            text = "Sair",
            color = ErrorRed,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
              .clickable { onSignOut() }
              .testTag("sign_out_button")
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceAround
      ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(
            text = "${profile.weightKg} kg",
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.testTag("athlete_weight_stat")
          )
          Text(
            text = if (isConfigured) "Peso" else "Peso (exemplo)",
            color = TextMuted,
            fontSize = 11.sp
          )
        }
        Box(modifier = Modifier.width(1.dp).height(30.dp).background(ObsidianBorder))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(
            text = "${profile.heightCm} cm",
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.testTag("athlete_height_stat")
          )
          Text(
            text = if (isConfigured) "Altura" else "Altura (exemplo)",
            color = TextMuted,
            fontSize = 11.sp
          )
        }
        Box(modifier = Modifier.width(1.dp).height(30.dp).background(ObsidianBorder))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(text = profile.activityLevel.label, color = ElectricLime, fontWeight = FontWeight.Bold, fontSize = 14.sp)
          Text(
            text = if (isConfigured) "Nível" else "Nível (exemplo)",
            color = TextMuted,
            fontSize = 11.sp
          )
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
  val currentProfile = state.profile
  val currentUser = state.currentUser
  val isConfigured = state.profileConfigured

  // Strictly bind form state to identity and configuration so identity switches immediately discard stale inputs
  var name by remember(currentUser, currentProfile) {
    mutableStateOf(if (isConfigured) currentProfile.name else "")
  }
  var weightStr by remember(currentUser, currentProfile) {
    mutableStateOf(if (isConfigured) currentProfile.weightKg.toString() else "")
  }
  var heightStr by remember(currentUser, currentProfile) {
    mutableStateOf(if (isConfigured) currentProfile.heightCm.toString() else "")
  }
  var birthYearStr by remember(currentUser, currentProfile) {
    mutableStateOf(if (isConfigured) currentProfile.birthYear.toString() else "")
  }
  var activityLevel by remember(currentUser, currentProfile) { mutableStateOf(currentProfile.activityLevel) }
  var sex by remember(currentUser, currentProfile) { mutableStateOf(currentProfile.sex) }

  var weightError by remember(currentUser, currentProfile) { mutableStateOf<String?>(null) }
  var heightError by remember(currentUser, currentProfile) { mutableStateOf<String?>(null) }
  var birthYearError by remember(currentUser, currentProfile) { mutableStateOf<String?>(null) }

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
        Text(text = "Editar Perfil (Temporário)", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 18.sp)
        Text(
          text = "Dados mantidos apenas na memória local desta sessão. Não são sincronizados na nuvem nem transferidos entre contas.",
          color = TextSecondary,
          fontSize = 11.sp,
          modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
        )

        OutlinedTextField(
          value = name,
          onValueChange = { name = it },
          label = { Text("Nome do Atleta") },
          placeholder = { Text(if (isConfigured) currentProfile.name else "Nome do Atleta (opcional)") },
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = ElectricLime,
            unfocusedBorderColor = ObsidianBorder,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("athlete_name_input")
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          OutlinedTextField(
            value = weightStr,
            onValueChange = {
              weightStr = it
              weightError = null
            },
            label = { Text("Peso (kg)") },
            placeholder = { Text("Ex: 72.0") },
            isError = weightError != null,
            supportingText = weightError?.let { err ->
              { Text(err, color = ErrorRed, fontSize = 10.sp, modifier = Modifier.testTag("athlete_weight_error")) }
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              errorBorderColor = ErrorRed,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier
              .weight(1f)
              .testTag("athlete_weight_input")
          )
          OutlinedTextField(
            value = heightStr,
            onValueChange = {
              heightStr = it
              heightError = null
            },
            label = { Text("Altura (cm)") },
            placeholder = { Text("Ex: 175") },
            isError = heightError != null,
            supportingText = heightError?.let { err ->
              { Text(err, color = ErrorRed, fontSize = 10.sp, modifier = Modifier.testTag("athlete_height_error")) }
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              errorBorderColor = ErrorRed,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary
            ),
            modifier = Modifier
              .weight(1f)
              .testTag("athlete_height_input")
          )
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
          value = birthYearStr,
          onValueChange = {
            birthYearStr = it
            birthYearError = null
          },
          label = { Text("Ano de Nascimento") },
          placeholder = { Text(if (isConfigured) currentProfile.birthYear.toString() else "Ex: 1998") },
          isError = birthYearError != null,
          supportingText = birthYearError?.let { err ->
            { Text(err, color = ErrorRed, fontSize = 10.sp, modifier = Modifier.testTag("athlete_birth_year_error")) }
          },
          singleLine = true,
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = ElectricLime,
            unfocusedBorderColor = ObsidianBorder,
            errorBorderColor = ErrorRed,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("athlete_birth_year_input")
        )

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
              val trimmedWeight = weightStr.trim().replace(',', '.')
              val trimmedHeight = heightStr.trim()
              val trimmedBirthYear = birthYearStr.trim()

              var valid = true

              val w = trimmedWeight.toFloatOrNull()
              if (trimmedWeight.isEmpty()) {
                weightError = "Informe o peso"
                valid = false
              } else if (w == null || !w.isFinite() || w <= 0f) {
                weightError = "Peso inválido (deve ser positivo)"
                valid = false
              } else {
                weightError = null
              }

              val h = trimmedHeight.toIntOrNull()
              if (trimmedHeight.isEmpty()) {
                heightError = "Informe a altura"
                valid = false
              } else if (h == null || h <= 0) {
                heightError = "Altura inválida (deve ser positiva)"
                valid = false
              } else {
                heightError = null
              }

              val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
              val parsedYear = trimmedBirthYear.toIntOrNull()
              if (trimmedBirthYear.isEmpty()) {
                birthYearError = "Informe o ano de nascimento"
                valid = false
              } else if (parsedYear == null || parsedYear !in 1900..currentYear) {
                birthYearError = "Ano inválido (1900 a $currentYear)"
                valid = false
              } else {
                birthYearError = null
              }

              if (!valid || w == null || h == null || parsedYear == null) return@Button

              val finalName = name.trim().ifBlank {
                when (val u = currentUser) {
                  is com.example.data.GuestUser -> u.displayName
                  else -> "Atleta"
                }
              }
              onSave(finalName, w, h, parsedYear, activityLevel, sex)
            },
            colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
              .weight(1f)
              .testTag("apply_profile_button")
          ) {
            Text("Aplicar no Aparelho", fontWeight = FontWeight.Bold, fontSize = 12.sp)
          }
        }
      }
    }
  }
}

@Composable
fun SupabaseCloudCard(status: SupabaseCloudStatus, onSync: () -> Unit) {
  Card(colors = CardDefaults.cardColors(containerColor = ObsidianSurface), modifier = Modifier.fillMaxWidth()) {
    Column(Modifier.padding(16.dp)) {
      Text("Sincronização indisponível", color = TextPrimary, fontWeight = FontWeight.Bold)
      Text(status.lastSyncMessage, color = TextSecondary)
      TextButton(onClick = onSync) { Text("Verificar disponibilidade") }
    }
  }
}
