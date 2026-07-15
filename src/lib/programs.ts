export type Level = "iniciante" | "intermediario" | "avancado";

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

export const PROGRAMS: Program[] = [
  {
    id: "p1",
    slug: "fundacao",
    level: "iniciante",
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
        videoId: "wxRRYQ_-l3g",
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
        videoId: "KOaCA-4tqk0",
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
        videoId: "IucRTUP7Q1I",
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
        videoId: "s1_TmnPeaJk",
        cue: "Puxe alto, gire os punhos, empurre.",
      },
      {
        id: "e10",
        name: "Front lever tuck",
        sets: "5 × 10-15s",
        rest: "120s",
        focus: "Dorsais, core",
        videoId: "cUsIJ9m9WPk",
        cue: "Escápulas deprimidas. Corpo paralelo ao solo.",
      },
      {
        id: "e11",
        name: "Planche lean",
        sets: "5 × 20s",
        rest: "120s",
        focus: "Ombros, peito, core",
        videoId: "sICzM66sZbc",
        cue: "Incline até os ombros passarem dos punhos.",
      },
      {
        id: "e12",
        name: "Handstand contra parede",
        sets: "5 × 30-60s",
        rest: "90s",
        focus: "Ombros, equilíbrio",
        videoId: "MyKFhKtvIfg",
        cue: "Pressione o chão. Costela para dentro.",
      },
    ],
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
