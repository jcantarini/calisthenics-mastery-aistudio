package com.example.model

enum class FitnessLevel(val label: String, val badge: String, val desc: String) {
  INICIANTE("Iniciante", "01", "Base de força e mobilidade."),
  INTERMEDIARIO("Intermediário", "02", "Progressões para primeira barra, dip e L-sit."),
  AVANCADO("Avançado", "03", "Muscle-up, front lever e planche em construção.")
}

enum class ProgramCategory(val label: String, val desc: String) {
  CALISTENIA("Calistenia", "Peso do corpo, força e habilidade."),
  CARDIO("Cardio", "Condicionamento, queima calórica e resistência."),
  MILITAR("Militar", "Treinos de resistência e intensidade extrema.")
}

data class Exercise(
  val id: String,
  val name: String,
  val sets: String,
  val rest: String,
  val focus: String,
  val videoId: String,
  val cue: String
)

data class Program(
  val id: String,
  val slug: String,
  val level: FitnessLevel,
  val category: ProgramCategory,
  val title: String,
  val tagline: String,
  val weeks: Int,
  val daysPerWeek: Int,
  val duration: String,
  val goal: String,
  val colorHex: Long,
  val exercises: List<Exercise>
)

enum class GoalCategory(val label: String) {
  FORCA("Força"),
  HABILIDADE("Habilidade"),
  TEMPO("Tempo"),
  FREQUENCIA("Frequência")
}

data class Goal(
  val id: String,
  val title: String,
  val category: GoalCategory,
  val current: Int,
  val target: Int,
  val unit: String,
  val deadline: String,
  val xpReward: Int,
  val isCompleted: Boolean = false
)

data class Achievement(
  val id: String,
  val title: String,
  val description: String,
  val xpReward: Int,
  val isUnlocked: Boolean = false,
  val category: String = "Geral"
)

data class WorkoutSession(
  val id: String,
  val timestamp: Long,
  val label: String,
  val durationSec: Int,
  val kcalBurned: Int,
  val source: String // "programa", "timer", "manual"
)

enum class Sex(val label: String) {
  MASCULINO("Masculino"),
  FEMININO("Feminino")
}

enum class ActivityLevel(val label: String, val factor: Double) {
  SEDENTARIO("Sedentário", 1.2),
  LEVE("Levemente Ativo", 1.375),
  MODERADO("Moderadamente Ativo", 1.55),
  INTENSO("Muito Ativo", 1.725),
  ATLETA("Atleta de Elite", 1.9)
}

data class UserProfile(
  val name: String = "Atleta",
  val weightKg: Float = 72.0f,
  val heightCm: Int = 175,
  val birthYear: Int = 1998,
  val sex: Sex = Sex.MASCULINO,
  val activityLevel: ActivityLevel = ActivityLevel.MODERADO
)

enum class TimerPhase(val label: String, val colorHex: Long) {
  PREP("Preparação", 0xFFE3B341),
  WORK("Execução", 0xFFD4FF00),
  REST("Descanso", 0xFFFF6B35),
  SET_REST("Descanso de Série", 0xFF58A6FF),
  DONE("Concluído", 0xFF2EA043)
}

data class TimerPreset(
  val key: String,
  val label: String,
  val prep: Int,
  val work: Int,
  val rest: Int,
  val rounds: Int,
  val sets: Int,
  val setRest: Int
)

data class TimerConfig(
  val prep: Int = 10,
  val work: Int = 40,
  val rest: Int = 20,
  val rounds: Int = 6,
  val sets: Int = 3,
  val setRest: Int = 60,
  val sound: Boolean = true,
  val vibrate: Boolean = true
)
