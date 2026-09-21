package com.example.data

import com.example.model.*

object CalisthenicsData {

  val PROGRAMS: List<Program> = listOf(
    Program(
      id = "p1",
      slug = "fundacao",
      level = FitnessLevel.INICIANTE,
      category = ProgramCategory.CALISTENIA,
      title = "Fundação",
      tagline = "Do chão para a barra com base sólida",
      weeks = 6,
      daysPerWeek = 3,
      duration = "30 min",
      goal = "5 flexões perfeitas + 20s de prancha isométrica",
      colorHex = 0xFFD4FF00,
      exercises = listOf(
        Exercise(
          id = "e1",
          name = "Flexão inclinada",
          sets = "4 × 8-12",
          rest = "60s",
          focus = "Peitoral, tríceps, core",
          videoId = "cfns5VDVVvk",
          cue = "Corpo em linha reta. Cotovelos a 45° do tronco."
        ),
        Exercise(
          id = "e2",
          name = "Agachamento livre",
          sets = "4 × 15",
          rest = "60s",
          focus = "Quadríceps, glúteos",
          videoId = "aclHkVaku9U",
          cue = "Joelhos alinhados com os pés. Peito ereto e peso nos calcanhares."
        ),
        Exercise(
          id = "e3",
          name = "Remada australiana",
          sets = "3 × 10",
          rest = "90s",
          focus = "Dorsais, bíceps, trapézio",
          videoId = "dnpDUwqMX04",
          cue = "Puxe o peito até a barra. Escápulas bem retraídas no topo."
        ),
        Exercise(
          id = "e4",
          name = "Prancha frontal",
          sets = "3 × 30s",
          rest = "45s",
          focus = "Core e estabilidade lombar",
          videoId = "ASdvN_XEl_c",
          cue = "Glúteos e abdômen contraídos. Não deixe o quadril ceder."
        )
      )
    ),
    Program(
      id = "p2",
      slug = "barra-fixa",
      level = FitnessLevel.INTERMEDIARIO,
      category = ProgramCategory.CALISTENIA,
      title = "Domínio da Barra",
      tagline = "Sua primeira barra estrita, dips e L-sit",
      weeks = 8,
      daysPerWeek = 4,
      duration = "45 min",
      goal = "5 barras estritas + 10 dips + 15s L-sit",
      colorHex = 0xFFFF6B35,
      exercises = listOf(
        Exercise(
          id = "e5",
          name = "Barra negativa (Excêntrica)",
          sets = "5 × 3",
          rest = "120s",
          focus = "Dorsais, bíceps, antebraço",
          videoId = "eGo4IYlbE5g",
          cue = "Suba com salto e desça controlando em 5 segundos."
        ),
        Exercise(
          id = "e6",
          name = "Dip em paralelas",
          sets = "4 × 6-8",
          rest = "90s",
          focus = "Peito inferior, tríceps, ombros",
          videoId = "2z8JmcrW-As",
          cue = "Ombros para baixo e para trás. Desça até 90° no cotovelo."
        ),
        Exercise(
          id = "e7",
          name = "L-sit tuck nas paralelas",
          sets = "5 × 10s",
          rest = "60s",
          focus = "Core, flexores de quadril",
          videoId = "IUZJoSP66HI",
          cue = "Deprima os ombros e eleve os joelhos ao peito."
        ),
        Exercise(
          id = "e8",
          name = "Pistol squat assistido",
          sets = "3 × 5 cada perna",
          rest = "90s",
          focus = "Força unilateral de pernas e equilíbrio",
          videoId = "vq5-vdgJc0I",
          cue = "Segure em um ponto de apoio leve e desça com controle."
        )
      )
    ),
    Program(
      id = "p3",
      slug = "rota-elite",
      level = FitnessLevel.AVANCADO,
      category = ProgramCategory.CALISTENIA,
      title = "Rota Elite",
      tagline = "Muscle-up, front lever e planche progressiva",
      weeks = 12,
      daysPerWeek = 5,
      duration = "60 min",
      goal = "1 muscle-up limpo + front lever tuck 10s",
      colorHex = 0xFFD4FF00,
      exercises = listOf(
        Exercise(
          id = "e9",
          name = "Muscle-up explosivo",
          sets = "6 × 2",
          rest = "180s",
          focus = "Dorsais, tríceps, potência explosiva",
          videoId = "_iYvlSMgUGE",
          cue = "Puxe forte em curva, gire os punhos e empurre o peito."
        ),
        Exercise(
          id = "e10",
          name = "Front lever tuck",
          sets = "5 × 12s",
          rest = "120s",
          focus = "Dorsais e cadeia posterior",
          videoId = "AGhb8V8M758",
          cue = "Escápulas deprimidas e braços totalmente travados."
        ),
        Exercise(
          id = "e11",
          name = "Planche lean",
          sets = "5 × 20s",
          rest = "90s",
          focus = "Deltoide anterior, bíceps e core",
          videoId = "wKV5zVJTYBo",
          cue = "Protraia as escápulas e incline o corpo à frente."
        ),
        Exercise(
          id = "e12",
          name = "Handstand contra parede",
          sets = "5 × 35s",
          rest = "90s",
          focus = "Ombros, trapézio e equilíbrio",
          videoId = "xMFRkQpXVoI",
          cue = "Empurre o chão com as mãos e mantenha as costelas fechadas."
        )
      )
    ),
    Program(
      id = "p4",
      slug = "cardio-ignicao",
      level = FitnessLevel.INICIANTE,
      category = ProgramCategory.CARDIO,
      title = "Cardio Ignição",
      tagline = "Condicionamento de alta intensidade sem equipamentos",
      weeks = 4,
      daysPerWeek = 3,
      duration = "20 min",
      goal = "10 min contínuos de corrida + 50 polichinelos",
      colorHex = 0xFF58A6FF,
      exercises = listOf(
        Exercise(
          id = "e13",
          name = "Polichinelo cadenciado",
          sets = "4 × 45s",
          rest = "20s",
          focus = "Frequência cardíaca, panturrilha",
          videoId = "c4DAnQ6DtF8",
          cue = "Aterrissagem leve na ponta dos pés, braços amplos."
        ),
        Exercise(
          id = "e14",
          name = "Elevação de joelhos (High Knees)",
          sets = "4 × 30s",
          rest = "30s",
          focus = "Cardio explosivo, core",
          videoId = "OAJ_J3EZkdY",
          cue = "Suba os joelhos na altura da cintura com ritmo acelerado."
        ),
        Exercise(
          id = "e15",
          name = "Mountain Climbers (Escalador)",
          sets = "4 × 35s",
          rest = "30s",
          focus = "Resistência de core e ombros",
          videoId = "nmwgirgXLYM",
          cue = "Mantenha a prancha estável enquanto alterna as pernas velozmente."
        ),
        Exercise(
          id = "e16",
          name = "Burpees calistênicos",
          sets = "3 × 10",
          rest = "45s",
          focus = "Corpo inteiro e potência",
          videoId = "TU8QYVW0gDU",
          cue = "Sem dobrar a coluna ao descer, salte com explosão."
        )
      )
    ),
    Program(
      id = "p5",
      slug = "circuito-militar",
      level = FitnessLevel.INTERMEDIARIO,
      category = ProgramCategory.MILITAR,
      title = "Circuito Operacional",
      tagline = "Força e resistência funcional sob pressão",
      weeks = 6,
      daysPerWeek = 4,
      duration = "40 min",
      goal = "20 flexões perfeitas + 10 barras + corrida 2.4km",
      colorHex = 0xFFE3B341,
      exercises = listOf(
        Exercise(
          id = "e17",
          name = "Flexão militar cadenciada",
          sets = "5 × 15",
          rest = "60s",
          focus = "Peito, ombros e resistência",
          videoId = "IODxDxX7oi4",
          cue = "Peito encostando a 1cm do chão, corpo rígido como prancha."
        ),
        Exercise(
          id = "e18",
          name = "Barra pronada estrita",
          sets = "4 × 8",
          rest = "90s",
          focus = "Dorsais e bíceps",
          videoId = "eGo4IYlbE5g",
          cue = "Queixo totalmente acima da barra sem embalo (sem kipping)."
        ),
        Exercise(
          id = "e19",
          name = "Agachamento com salto",
          sets = "4 × 12",
          rest = "60s",
          focus = "Potência de pernas",
          videoId = "U4s4mEQ5VqU",
          cue = "Abaixe até paralelo e exploda verticalmente."
        ),
        Exercise(
          id = "e20",
          name = "Prancha dinâmica (Com toque nos ombros)",
          sets = "4 × 40s",
          rest = "45s",
          focus = "Anti-rotação de core",
          videoId = "ASdvN_XEl_c",
          cue = "Não balance o quadril ao tocar as mãos nos ombros opostos."
        )
      )
    )
  )

  val DEFAULT_GOALS: List<Goal> = listOf(
    Goal(
      id = "g1",
      title = "10 Flexões perfeitas",
      category = GoalCategory.FORCA,
      current = 6,
      target = 10,
      unit = "reps",
      deadline = "Fim do mês",
      xpReward = 150,
      isCompleted = false
    ),
    Goal(
      id = "g2",
      title = "Primeira Barra Fixa (Pull-up)",
      category = GoalCategory.FORCA,
      current = 0,
      target = 1,
      unit = "rep",
      deadline = "4 semanas",
      xpReward = 300,
      isCompleted = false
    ),
    Goal(
      id = "g3",
      title = "Prancha isométrica de 60 segundos",
      category = GoalCategory.TEMPO,
      current = 40,
      target = 60,
      unit = "segundos",
      deadline = "2 semanas",
      xpReward = 200,
      isCompleted = false
    ),
    Goal(
      id = "g4",
      title = "4 Treinos completos nesta semana",
      category = GoalCategory.FREQUENCIA,
      current = 3,
      target = 4,
      unit = "treinos",
      deadline = "Domingo",
      xpReward = 250,
      isCompleted = false
    ),
    Goal(
      id = "g5",
      title = "Handstand (Parada de mão) 15s",
      category = GoalCategory.HABILIDADE,
      current = 5,
      target = 15,
      unit = "segundos",
      deadline = "6 semanas",
      xpReward = 400,
      isCompleted = false
    ),
    Goal(
      id = "g6",
      title = "1 Muscle-up limpo na barra",
      category = GoalCategory.HABILIDADE,
      current = 0,
      target = 1,
      unit = "rep",
      deadline = "8 semanas",
      xpReward = 500,
      isCompleted = false
    )
  )

  val DEFAULT_ACHIEVEMENTS: List<Achievement> = listOf(
    Achievement("a1", "Primeiro Passo", "Concluiu seu primeiro treino no app", 100, true, "Treino"),
    Achievement("a2", "Guerreiro da Barra", "Realizou uma sessão de puxada na barra fixa", 150, true, "Habilidade"),
    Achievement("a3", "Mestre do HIIT", "Concluiu 1 sessão completa no Cronômetro Intervalado", 120, false, "Timer"),
    Achievement("a4", "Disciplina de Ferro", "Alcançou sequência de 3 dias consecutivos", 200, false, "Consistência"),
    Achievement("a5", "Queima Calórica 500+", "Acumulou mais de 500 kcal queimadas em treinos", 250, false, "Performance"),
    Achievement("a6", "Mestre da Calistenia", "Completou 5 metas pessoais de força e habilidade", 500, false, "Elite")
  )

  val TIMER_PRESETS: List<TimerPreset> = listOf(
    TimerPreset("tabata", "Tabata (20s/10s)", prep = 10, work = 20, rest = 10, rounds = 8, sets = 1, setRest = 60),
    TimerPreset("hiit", "HIIT Calistenia (40s/20s)", prep = 10, work = 40, rest = 20, rounds = 6, sets = 3, setRest = 60),
    TimerPreset("militar", "Circuito Militar (45s/15s)", prep = 10, work = 45, rest = 15, rounds = 10, sets = 1, setRest = 0),
    TimerPreset("express", "Express Rápido (30s/15s)", prep = 5, work = 30, rest = 15, rounds = 5, sets = 2, setRest = 30)
  )
}
