package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import com.example.data.CalisthenicsData
import com.example.model.FitnessLevel
import com.example.model.Program
import com.example.model.ProgramCategory
import com.example.ui.theme.*

@Composable
fun ProgramsScreen(
  activeProgramId: String,
  onSelectActiveProgram: (String) -> Unit,
  onStartWorkout: (Program) -> Unit
) {
  var selectedCategoryFilter by remember { mutableStateOf<ProgramCategory?>(null) }
  var selectedProgramForDetail by remember { mutableStateOf<Program?>(null) }

  val filteredPrograms = remember(selectedCategoryFilter) {
    if (selectedCategoryFilter == null) {
      CalisthenicsData.PROGRAMS
    } else {
      CalisthenicsData.PROGRAMS.filter { it.category == selectedCategoryFilter }
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg)
      .padding(horizontal = 16.dp)
  ) {
    // Screen Title
    Text(
      text = "Rotinas & Programas",
      color = TextPrimary,
      fontSize = 24.sp,
      fontWeight = FontWeight.Black,
      modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
    )
    Text(
      text = "Treinos progressivos estruturados para ganho de força e habilidade",
      color = TextSecondary,
      fontSize = 13.sp,
      modifier = Modifier.padding(bottom = 16.dp)
    )

    // Category Filter Chips
    LazyRow(
      horizontalArrangement = Arrangement.spacedBy(8.dp),
      modifier = Modifier.padding(bottom = 16.dp)
    ) {
      item {
        FilterChip(
          selected = selectedCategoryFilter == null,
          onClick = { selectedCategoryFilter = null },
          label = { Text("Todos", fontWeight = FontWeight.SemiBold) },
          colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = ElectricLime,
            selectedLabelColor = ObsidianBg,
            containerColor = ObsidianSurface,
            labelColor = TextSecondary
          ),
          border = FilterChipDefaults.filterChipBorder(
            borderColor = ObsidianBorder,
            selectedBorderColor = ElectricLime,
            enabled = true,
            selected = selectedCategoryFilter == null
          )
        )
      }
      items(ProgramCategory.entries) { category ->
        val isSelected = selectedCategoryFilter == category
        FilterChip(
          selected = isSelected,
          onClick = { selectedCategoryFilter = category },
          label = { Text(category.label, fontWeight = FontWeight.SemiBold) },
          colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = ElectricLime,
            selectedLabelColor = ObsidianBg,
            containerColor = ObsidianSurface,
            labelColor = TextSecondary
          ),
          border = FilterChipDefaults.filterChipBorder(
            borderColor = ObsidianBorder,
            selectedBorderColor = ElectricLime,
            enabled = true,
            selected = isSelected
          )
        )
      }
    }

    // Program Cards List
    LazyColumn(
      verticalArrangement = Arrangement.spacedBy(14.dp),
      contentPadding = PaddingValues(bottom = 32.dp),
      modifier = Modifier.fillMaxSize()
    ) {
      items(filteredPrograms) { program ->
        val isActive = program.id == activeProgramId
        ProgramCard(
          program = program,
          isActive = isActive,
          onClick = { selectedProgramForDetail = program },
          onStart = { onStartWorkout(program) }
        )
      }
    }
  }

  // Program Detail Dialog
  selectedProgramForDetail?.let { program ->
    ProgramDetailDialog(
      program = program,
      isActive = program.id == activeProgramId,
      onDismiss = { selectedProgramForDetail = null },
      onSetActive = {
        onSelectActiveProgram(program.id)
        selectedProgramForDetail = null
      },
      onStart = {
        selectedProgramForDetail = null
        onStartWorkout(program)
      }
    )
  }
}

@Composable
private fun ProgramCard(
  program: Program,
  isActive: Boolean,
  onClick: () -> Unit,
  onStart: () -> Unit
) {
  val levelColor = when (program.level) {
    FitnessLevel.INICIANTE -> ElectricLime
    FitnessLevel.INTERMEDIARIO -> EmberOrange
    FitnessLevel.AVANCADO -> Color(0xFFF85149)
  }

  Card(
    shape = RoundedCornerShape(20.dp),
    colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
    border = androidx.compose.foundation.BorderStroke(
      width = if (isActive) 1.5.dp else 1.dp,
      color = if (isActive) ElectricLime else ObsidianBorder
    ),
    modifier = Modifier
      .fillMaxWidth()
      .clickable { onClick() }
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
              .background(levelColor.copy(alpha = 0.15f))
              .border(1.dp, levelColor.copy(alpha = 0.4f), RoundedCornerShape(6.dp))
              .padding(horizontal = 8.dp, vertical = 2.dp)
          ) {
            Text(
              text = program.level.label.uppercase(),
              color = levelColor,
              fontWeight = FontWeight.Bold,
              fontSize = 11.sp
            )
          }
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = program.category.label,
            color = TextSecondary,
            fontSize = 12.sp
          )
        }

        if (isActive) {
          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(12.dp))
              .background(ElectricLime)
              .padding(horizontal = 8.dp, vertical = 3.dp)
          ) {
            Text(
              text = "EM ANDAMENTO",
              color = ObsidianBg,
              fontSize = 10.sp,
              fontWeight = FontWeight.ExtraBold
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      Text(
        text = program.title,
        color = TextPrimary,
        fontSize = 20.sp,
        fontWeight = FontWeight.Black
      )

      Text(
        text = program.tagline,
        color = TextSecondary,
        fontSize = 13.sp,
        modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
      )

      // Meta pills (Duração, Semanas, Frequência)
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        ProgramMetaInfo(icon = Icons.Default.Schedule, text = program.duration)
        ProgramMetaInfo(icon = Icons.Default.CalendarToday, text = "${program.weeks} semanas")
        ProgramMetaInfo(icon = Icons.Default.Repeat, text = "${program.daysPerWeek}x/sem")
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Action Buttons
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        OutlinedButton(
          onClick = onClick,
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
          border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
          modifier = Modifier.weight(1f)
        ) {
          Text("Ver Exercícios", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }

        Button(
          onClick = onStart,
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
          modifier = Modifier.weight(1f)
        ) {
          Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(4.dp))
          Text("Treinar", fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
      }
    }
  }
}

@Composable
private fun ProgramMetaInfo(
  icon: androidx.compose.ui.graphics.vector.ImageVector,
  text: String
) {
  Row(verticalAlignment = Alignment.CenterVertically) {
    Icon(
      imageVector = icon,
      contentDescription = null,
      tint = TextMuted,
      modifier = Modifier.size(14.dp)
    )
    Spacer(modifier = Modifier.width(4.dp))
    Text(text = text, color = TextSecondary, fontSize = 12.sp)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProgramDetailDialog(
  program: Program,
  isActive: Boolean,
  onDismiss: () -> Unit,
  onSetActive: () -> Unit,
  onStart: () -> Unit
) {
  ModalBottomSheet(
    onDismissRequest = onDismiss,
    containerColor = ObsidianSurface,
    dragHandle = { BottomSheetDefaults.DragHandle(color = ObsidianBorder) },
    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 20.dp)
        .padding(bottom = 32.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(
            text = program.title,
            color = TextPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black
          )
          Text(
            text = program.tagline,
            color = TextSecondary,
            fontSize = 13.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Goal Callout
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(ObsidianSurfaceElevated)
          .border(1.dp, ObsidianBorder, RoundedCornerShape(14.dp))
          .padding(12.dp)
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(
            imageVector = Icons.Default.Flag,
            contentDescription = null,
            tint = ElectricLime,
            modifier = Modifier.size(20.dp)
          )
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(
              text = "Objetivo do Programa",
              color = TextSecondary,
              fontSize = 11.sp,
              fontWeight = FontWeight.SemiBold
            )
            Text(
              text = program.goal,
              color = TextPrimary,
              fontSize = 13.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      Text(
        text = "Lista de Exercícios (${program.exercises.size})",
        color = TextPrimary,
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 8.dp)
      )

      LazyColumn(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.heightIn(max = 280.dp)
      ) {
        items(program.exercises) { ex ->
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(12.dp))
              .background(ObsidianSurfaceElevated)
              .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(ElectricLime.copy(alpha = 0.15f)),
              contentAlignment = Alignment.Center
            ) {
              Icon(
                imageVector = Icons.Default.FitnessCenter,
                contentDescription = null,
                tint = ElectricLime,
                modifier = Modifier.size(18.dp)
              )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = ex.name,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
              )
              Text(
                text = "${ex.sets} • Descanso: ${ex.rest}",
                color = ElectricLime,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
              )
              Text(
                text = "💡 ${ex.cue}",
                color = TextSecondary,
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 2.dp)
              )
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        if (!isActive) {
          OutlinedButton(
            onClick = onSetActive,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
            border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
            modifier = Modifier.weight(1f)
          ) {
            Text("Tornar Ativo", fontSize = 14.sp)
          }
        }

        Button(
          onClick = onStart,
          shape = RoundedCornerShape(14.dp),
          colors = ButtonDefaults.buttonColors(containerColor = ElectricLime, contentColor = ObsidianBg),
          modifier = Modifier.weight(1f)
        ) {
          Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text("Iniciar Treino", fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
      }
    }
  }
}
