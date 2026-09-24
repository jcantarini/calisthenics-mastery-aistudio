package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
  isLoading: Boolean,
  errorMessage: String?,
  onGoogleSignIn: () -> Unit,
  onGuestSignIn: (String) -> Unit,
  googleConfigured: Boolean = false
) {
  var athleteName by remember { mutableStateOf("") }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(ObsidianBg)
  ) {
    // Top Background Image with athletic gradient
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(290.dp)
    ) {
      Image(
        painter = painterResource(id = R.drawable.img_hero_calisthenics),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier.fillMaxSize()
      )
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(
            Brush.verticalGradient(
              colors = listOf(
                ObsidianBg.copy(alpha = 0.45f),
                ObsidianBg.copy(alpha = 0.85f),
                ObsidianBg
              )
            )
          )
      )
    }

    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 24.dp, vertical = 20.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.SpaceBetween
    ) {
      // Top Brand Header
      Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(top = 28.dp)
      ) {
        Box(
          modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(ElectricLime.copy(alpha = 0.15f))
            .border(2.dp, ElectricLime, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Image(
            painter = painterResource(id = R.drawable.img_app_icon),
            contentDescription = "Logo",
            contentScale = ContentScale.Crop,
            modifier = Modifier
              .size(62.dp)
              .clip(CircleShape)
          )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(ElectricLime)
            .padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
          Text(
            text = "CALISTHENICS MASTERY",
            color = ObsidianBg,
            fontWeight = FontWeight.Black,
            fontSize = 11.sp,
            letterSpacing = 1.sp
          )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
          text = "Bem-vindo de volta",
          color = TextPrimary,
          fontSize = 24.sp,
          fontWeight = FontWeight.Black
        )

        Text(
          text = "Acesse seus treinos na barra, timer HIIT e metas",
          color = TextSecondary,
          fontSize = 13.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
        )
      }

      // Center Actions Card
      Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = ObsidianSurface),
        border = androidx.compose.foundation.BorderStroke(1.dp, ObsidianBorder),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(
          modifier = Modifier.padding(20.dp),
          horizontalAlignment = Alignment.CenterHorizontally
        ) {
          // Error Message Banner if any
          if (!errorMessage.isNullOrBlank()) {
            Box(
              modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(ErrorRed.copy(alpha = 0.15f))
                .border(1.dp, ErrorRed.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                .padding(12.dp)
            ) {
              Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                  imageVector = Icons.Default.Info,
                  contentDescription = null,
                  tint = ErrorRed,
                  modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                  text = errorMessage,
                  color = TextPrimary,
                  fontSize = 12.sp
                )
              }
            }
            Spacer(modifier = Modifier.height(14.dp))
          }

          // Primary Official Google Sign-In Button
          Button(
            onClick = onGoogleSignIn,
            enabled = !isLoading,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
              containerColor = Color.White,
              contentColor = Color(0xFF1F1F1F)
            ),
            modifier = Modifier
              .fillMaxWidth()
              .height(52.dp)
          ) {
            if (isLoading) {
              CircularProgressIndicator(
                color = ObsidianBg,
                strokeWidth = 2.5.dp,
                modifier = Modifier.size(22.dp)
              )
            } else {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
              ) {
                GoogleGIcon()
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                  text = if (googleConfigured) "Entrar com Google" else "Google indisponível por enquanto",
                  color = Color(0xFF1F1F1F),
                  fontWeight = FontWeight.Bold,
                  fontSize = 15.sp
                )
              }
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          // Divider
          Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(ObsidianBorder)
            )
            Text(
              text = "OU ENTRAR COMO CONVIDADO",
              color = TextMuted,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              modifier = Modifier.padding(horizontal = 10.dp)
            )
            Box(
              modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(ObsidianBorder)
            )
          }

          Spacer(modifier = Modifier.height(14.dp))

          // Athlete Name input
          OutlinedTextField(
            value = athleteName,
            onValueChange = { athleteName = it },
            placeholder = { Text("Seu nome de atleta (opcional)") },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = ElectricLime,
              unfocusedBorderColor = ObsidianBorder,
              focusedTextColor = TextPrimary,
              unfocusedTextColor = TextPrimary,
              focusedContainerColor = ObsidianSurfaceElevated,
              unfocusedContainerColor = ObsidianSurfaceElevated
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
          )

          Spacer(modifier = Modifier.height(12.dp))

          // Guest Sign-in Button
          Button(
            onClick = {
              val name = if (athleteName.isNotBlank()) athleteName.trim() else "Atleta"
              onGuestSignIn(name)
            },
            enabled = !isLoading,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
              containerColor = ElectricLime,
              contentColor = ObsidianBg
            ),
            modifier = Modifier
              .fillMaxWidth()
              .height(48.dp)
          ) {
            Icon(
              imageVector = Icons.Default.FitnessCenter,
              contentDescription = null,
              modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              text = "Explorar como convidado",
              fontWeight = FontWeight.Black,
              fontSize = 14.sp
            )
          }
        }
      }

      // Footer
      Text(
        text = "Convidado: modo temporário sem conta. Treinos, histórico e recompensas ainda não são sincronizados.",
        color = TextMuted,
        fontSize = 11.sp,
        textAlign = TextAlign.Center
      )
    }

  }
}

@Composable
fun GoogleGIcon(modifier: Modifier = Modifier) {
  Box(
    modifier = modifier
      .size(22.dp)
      .clip(CircleShape)
      .background(Color.White),
    contentAlignment = Alignment.Center
  ) {
    Text(
      text = "G",
      color = Color(0xFF4285F4),
      fontWeight = FontWeight.Black,
      fontSize = 16.sp
    )
  }
}
