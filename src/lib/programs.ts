export type Level = "iniciante" | "intermediario" | "avancado";
export type Category = "calistenia" | "cardio" | "militar";

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  rest: string;
  focus: string;
  videoId: string; // YouTube video id
  cue: string;
}

export interface Program {
  id: string;
  slug: string;
  level: Level;
  category: Category;
  title: string;
  tagline: string;
  weeks: number;
  daysPerWeek: number;
  duration: string;
  goal: string;
  color: string; // css var reference
  exercises: Exercise[];
}

export const LEVEL_META: Record<Level, { label: string; description: string; badge: string }> = {
  iniciante: {
    label: "Iniciante",
    description: "Base de força e mobilidade. Sem barra? Sem problema.",
    badge: "01",
  },
  intermediario: {
    label: "Intermediário",
    description: "Progressões para a primeira barra, dip e L-sit.",
    badge: "02",
  },
  avancado: {
    label: "Avançado",
    description: "Muscle-up, front lever e planche em construção.",
    badge: "03",
  },
};

export const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  calistenia: {
    label: "Calistenia",
    description: "Peso do corpo, força e habilidade.",
  },
  cardio: {
    label: "Cardio",
    description: "Condicionamento, queima calórica e resistência.",
  },
  militar: {
    label: "Militar",
    description: "Treinos de resistência inspirados em preparação militar.",
  },
};

export const PROGRAMS: Program[] = [
  {
    id: "p1",
    slug: "fundacao",
    level: "iniciante",
    category: "calistenia",
    title: "Fundação",
    tagline: "Do sofá para a barra em 6 semanas",
    weeks: 6,
    daysPerWeek: 3,
    duration: "30 min",
    goal: "5 flexões perfeitas + 20s de prancha isométrica",
    color: "var(--lime)",
    exercises: [
      {
        id: "e1",
        name: "Flexão inclinada",
        sets: "4 × 8-12",
        rest: "60s",
        focus: "Peito, tríceps, core",
        videoId: "cfns5VDVVvk",
        cue: "Corpo em linha reta. Cotovelos a 45°.",
      },
      {
        id: "e2",
        name: "Agachamento livre",
        sets: "4 × 15",
        rest: "60s",
        focus: "Quadríceps, glúteos",
        videoId: "aclHkVaku9U",
        cue: "Joelhos alinhados com os pés. Peito ereto.",
      },
      {
        id: "e3",
        name: "Remada australiana",
        sets: "3 × 10",
        rest: "90s",
        focus: "Costas, bíceps",
        videoId: "dnpDUwqMX04",
        cue: "Puxe o peito até a barra. Escápulas retraídas.",
      },
      {
        id: "e4",
        name: "Prancha frontal",
        sets: "3 × 30s",
        rest: "45s",
        focus: "Core",
        videoId: "ASdvN_XEl_c",
        cue: "Glúteos contraídos. Não deixe o quadril cair.",
      },
    ],
  },
  {
    id: "p2",
    slug: "barra-fixa",
    level: "intermediario",
    category: "calistenia",
    title: "Domínio da Barra",
    tagline: "Sua primeira barra estrita, dip e L-sit",
    weeks: 8,
    daysPerWeek: 4,
    duration: "45 min",
    goal: "5 barras estritas + 10 dips + 15s L-sit",
    color: "var(--ember)",
    exercises: [
      {
        id: "e5",
        name: "Barra negativa",
        sets: "5 × 3",
        rest: "120s",
        focus: "Dorsais, bíceps",
        videoId: "eGo4IYlbE5g",
        cue: "Suba com salto, desça em 5 segundos.",
      },
      {
        id: "e6",
        name: "Dip em paralelas",
        sets: "4 × 6-8",
        rest: "90s",
        focus: "Peito, tríceps, ombros",
        videoId: "2z8JmcrW-As",
        cue: "Ombros para trás. Desça até 90° no cotovelo.",
      },
      {
        id: "e7",
        name: "L-sit tuck",
        sets: "5 × 10s",
        rest: "60s",
        focus: "Core, flexores de quadril",
        videoId: "IUZJoSP66HI",
        cue: "Deprima os ombros. Joelhos no peito.",
      },
      {
        id: "e8",
        name: "Pistol assistido",
        sets: "3 × 5 cada",
        rest: "90s",
        focus: "Pernas, equilíbrio",
        videoId: "vq5-vdgJc0I",
        cue: "Segure em um ponto fixo. Desça lento.",
      },
    ],
  },
  {
    id: "p3",
    slug: "elite",
    level: "avancado",
    category: "calistenia",
    title: "Rota Elite",
    tagline: "Muscle-up, front lever e planche progression",
    weeks: 12,
    daysPerWeek: 5,
    duration: "60 min",
    goal: "1 muscle-up limpo + front lever tuck 10s",
    color: "var(--lime)",
    exercises: [
      {
        id: "e9",
        name: "Muscle-up explosivo",
        sets: "6 × 2",
        rest: "180s",
        focus: "Dorsais, tríceps, potência",
        videoId: "_iYvlSMgUGE",
        cue: "Puxe alto, gire os punhos, empurre.",
      },
      {
        id: "e10",
        name: "Front lever tuck",
        sets: "5 × 10-15s",
        rest: "120s",
        focus: "Dorsais, core",
        videoId: "AGhb8V8M758",
        cue: "Escápulas deprimidas. Corpo paralelo ao solo.",
      },
      {
        id: "e11",
        name: "Planche lean",
        sets: "5 × 20s",
        rest: "120s",
        focus: "Ombros, peito, core",
        videoId: "wKV5zVJTYBo",
        cue: "Incline até os ombros passarem dos punhos.",
      },
      {
        id: "e12",
        name: "Handstand contra parede",
        sets: "5 × 30-60s",
        rest: "90s",
        focus: "Ombros, equilíbrio",
        videoId: "xMFRkQpXVoI",
        cue: "Pressione o chão. Costela para dentro.",
      },
    ],
  },
  {
    id: "p4",
    slug: "cardio-ignicao",
    level: "iniciante",
    category: "cardio",
    title: "Cardio Ignição",
    tagline: "Condicionamento sem equipamento em 20 minutos",
    weeks: 4,
    daysPerWeek: 3,
    duration: "20 min",
    goal: "10 min contínuos de trote + 50 polichinelos seguidos",
    color: "oklch(0.75 0.14 220)",
    exercises: [
      {
        id: "e13",
        name: "Polichinelo",
        sets: "4 × 45s",
        rest: "30s",
        focus: "Frequência cardíaca, panturrilhas",
        videoId: "c4DAnQ6DtF8",
        cue: "Salte leve, braços na altura da cabeça.",
      },
      {
        id: "e14",
        name: "Elevação de joelhos",
        sets: "4 × 30s",
        rest: "30s",
        focus: "Cardio, flexores de quadril",
        videoId: "OAJ_J3EZkdY",
        cue: "Joelhos na altura do quadril. Braços ativos.",
      },
      {
        id: "e15",
        name: "Escalador (mountain climber)",
        sets: "4 × 30s",
        rest: "30s",
        focus: "Core, cardio",
        videoId: "cnyTQDSE884",
        cue: "Quadril baixo. Alterne rápido sem saltar o quadril.",
      },
      {
        id: "e16",
        name: "Agachamento com salto",
        sets: "3 × 12",
        rest: "45s",
        focus: "Potência, pernas",
        videoId: "A-cFYWvaHr0",
        cue: "Aterrissagem suave, joelhos alinhados.",
      },
    ],
  },
  {
    id: "p5",
    slug: "cardio-hiit",
    level: "intermediario",
    category: "cardio",
    title: "HIIT Metabólico",
    tagline: "20 min de alta intensidade para queimar gordura",
    weeks: 6,
    daysPerWeek: 3,
    duration: "25 min",
    goal: "5 rounds Tabata sem falhar + 15 burpees em 60s",
    color: "var(--ember)",
    exercises: [
      {
        id: "e17",
        name: "Burpee completo",
        sets: "6 × 40s / 20s",
        rest: "20s",
        focus: "Corpo inteiro, cardio",
        videoId: "JZQA08SlJnM",
        cue: "Peito no chão, salte com braços estendidos.",
      },
      {
        id: "e18",
        name: "Pular corda (ou imaginária)",
        sets: "5 × 60s",
        rest: "30s",
        focus: "Coordenação, panturrilhas",
        videoId: "FJmRQ5iTXKE",
        cue: "Salto baixo. Punhos giram, não os ombros.",
      },
      {
        id: "e19",
        name: "Skater lateral",
        sets: "4 × 40s",
        rest: "20s",
        focus: "Glúteos, cardio",
        videoId: "5gtLC5BgN7Q",
        cue: "Salto lateral longo, aterrisse em uma perna.",
      },
      {
        id: "e20",
        name: "Sprint estacionário",
        sets: "6 × 20s / 40s",
        rest: "0s",
        focus: "VO2 máx, potência",
        videoId: "ZZZoCNMU48U",
        cue: "Corrida máxima no lugar. Braços rápidos.",
      },
    ],
  },
  {
    id: "p6",
    slug: "calistenia-militar",
    level: "avancado",
    category: "militar",
    title: "Calistenia Militar",
    tagline: "Treino inspirado em preparação de forças especiais",
    weeks: 8,
    daysPerWeek: 5,
    duration: "50 min",
    goal: "50 flexões + 20 barras + 100 abdominais + 3 km corrida",
    color: "var(--lime)",
    exercises: [
      {
        id: "e21",
        name: "Flexão militar (mãos próximas)",
        sets: "5 × máx",
        rest: "90s",
        focus: "Tríceps, peito, ombros",
        videoId: "_nZBx00BMWo",
        cue: "Cotovelos rentes ao corpo. Corpo em prancha rígida.",
      },
      {
        id: "e22",
        name: "Barra fixa pronada",
        sets: "5 × máx",
        rest: "120s",
        focus: "Dorsais, bíceps, antebraço",
        videoId: "eGo4IYlbE5g",
        cue: "Queixo passa da barra. Descida controlada.",
      },
      {
        id: "e23",
        name: "Abdominal completo militar",
        sets: "4 × 25",
        rest: "45s",
        focus: "Core, flexores de quadril",
        videoId: "1919eTCoESo",
        cue: "Cotovelos tocam os joelhos. Sem tranco.",
      },
      {
        id: "e24",
        name: "Burpee com barra",
        sets: "5 × 8",
        rest: "90s",
        focus: "Explosão, corpo inteiro",
        videoId: "auBLPXO8Fww",
        cue: "Burpee + salto na barra + 1 barra. Ciclo contínuo.",
      },
      {
        id: "e25",
        name: "Corrida intervalada",
        sets: "8 × 400m",
        rest: "60s",
        focus: "Resistência aeróbica",
        videoId: "brFHyOtTwH4",
        cue: "Ritmo forte constante. Foco na respiração.",
      },
      {
        id: "e26",
        name: "Bear crawl",
        sets: "4 × 20m",
        rest: "60s",
        focus: "Core, coordenação, resistência",
        videoId: "Wgt1vdZ_YYk",
        cue: "Quadril baixo. Braço e perna opostos.",
      },
    ],
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
