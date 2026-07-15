import type { ActivityLevel, Profile, Sex } from "./store";

export type BmiCategory = "abaixo" | "saudavel" | "sobrepeso" | "obesidade";
export type DietGoal = "cutting" | "manutencao" | "bulking";

export const ACTIVITY_META: Record<
  ActivityLevel,
  { label: string; multiplier: number; description: string }
> = {
  sedentario: { label: "Sedentário", multiplier: 1.2, description: "Pouco ou nenhum exercício" },
  leve: { label: "Leve", multiplier: 1.375, description: "1–3 treinos/semana" },
  moderado: { label: "Moderado", multiplier: 1.55, description: "3–5 treinos/semana" },
  intenso: { label: "Intenso", multiplier: 1.725, description: "6–7 treinos/semana" },
  atleta: { label: "Atleta", multiplier: 1.9, description: "2× ao dia ou trabalho físico" },
};

export const GOAL_META: Record<
  DietGoal,
  { label: string; delta: number; description: string; tone: string }
> = {
  cutting: {
    label: "Definição",
    delta: -0.2,
    description: "Déficit de 20% para perda de gordura preservando massa magra",
    tone: "var(--ember)",
  },
  manutencao: {
    label: "Manutenção",
    delta: 0,
    description: "Consumo igual ao gasto — recomposição corporal",
    tone: "var(--lime)",
  },
  bulking: {
    label: "Hipertrofia",
    delta: 0.12,
    description: "Superávit de 12% para ganho de massa muscular",
    tone: "var(--lime)",
  },
};

export function bmi(profile: Pick<Profile, "weightKg" | "heightCm">) {
  return profile.weightKg / Math.pow(profile.heightCm / 100, 2);
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "abaixo";
  if (value < 25) return "saudavel";
  if (value < 30) return "sobrepeso";
  return "obesidade";
}

export const BMI_META: Record<
  BmiCategory,
  { label: string; range: string; color: string; suggestedGoal: DietGoal; note: string }
> = {
  abaixo: {
    label: "Abaixo do peso",
    range: "< 18,5",
    color: "var(--ember)",
    suggestedGoal: "bulking",
    note: "Prioridade em superávit calórico com foco em proteína e ganho progressivo.",
  },
  saudavel: {
    label: "Peso saudável",
    range: "18,5 – 24,9",
    color: "var(--lime)",
    suggestedGoal: "manutencao",
    note: "Faixa ideal para performance. Recomposição corporal é o alvo mais eficiente.",
  },
  sobrepeso: {
    label: "Sobrepeso",
    range: "25 – 29,9",
    color: "var(--ember)",
    suggestedGoal: "cutting",
    note: "Déficit moderado com bastante proteína protege a massa magra durante o cutting.",
  },
  obesidade: {
    label: "Obesidade",
    range: "≥ 30",
    color: "var(--ember)",
    suggestedGoal: "cutting",
    note: "Recomendação de acompanhamento profissional. Foque em déficit sustentável e mobilidade.",
  },
};

// Mifflin–St Jeor
export function bmr(profile: {
  weightKg: number;
  heightCm: number;
  birthYear: number;
  sex: Sex;
}) {
  const age = new Date().getFullYear() - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === "masculino" ? base + 5 : base - 161;
}

export function tdee(profile: Profile) {
  return bmr(profile) * ACTIVITY_META[profile.activity].multiplier;
}

export function targetCalories(profile: Profile, goal: DietGoal) {
  return Math.round(tdee(profile) * (1 + GOAL_META[goal].delta));
}

// Macros: protein 1.8–2.2g/kg, fat 25% kcal, carbs remainder.
export function macrosFor(profile: Profile, kcal: number, goal: DietGoal) {
  const proteinPerKg = goal === "cutting" ? 2.2 : goal === "bulking" ? 1.8 : 2.0;
  const proteinG = Math.round(profile.weightKg * proteinPerKg);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, fatG, carbsG };
}

export interface MealItem {
  food: string;
  qty: string;
  kcal: number;
}
export interface Meal {
  id: string;
  name: string;
  time: string;
  ratio: number; // fraction of daily kcal
  items: MealItem[];
}

// Template distributes daily kcal across 5 meals. Portions scale with ratio.
const MEAL_TEMPLATE = (kcal: number): Meal[] => {
  const r = (frac: number) => Math.round(kcal * frac);
  return [
    {
      id: "cafe",
      name: "Café da manhã",
      time: "07:00",
      ratio: 0.25,
      items: [
        { food: "Ovos mexidos", qty: "3 unidades", kcal: 220 },
        { food: "Pão integral", qty: "2 fatias", kcal: 160 },
        { food: "Banana", qty: "1 média", kcal: 90 },
        { food: "Café preto", qty: "1 xícara", kcal: 5 },
      ].map((i) => ({ ...i, kcal: Math.round((i.kcal * r(0.25)) / 475) })),
    },
    {
      id: "lanche1",
      name: "Lanche da manhã",
      time: "10:00",
      ratio: 0.1,
      items: [
        { food: "Iogurte natural", qty: "200g", kcal: 130 },
        { food: "Aveia em flocos", qty: "30g", kcal: 110 },
      ].map((i) => ({ ...i, kcal: Math.round((i.kcal * r(0.1)) / 240) })),
    },
    {
      id: "almoco",
      name: "Almoço",
      time: "13:00",
      ratio: 0.3,
      items: [
        { food: "Peito de frango grelhado", qty: "150g", kcal: 250 },
        { food: "Arroz integral", qty: "4 col. sopa", kcal: 160 },
        { food: "Feijão preto", qty: "1 concha", kcal: 100 },
        { food: "Salada verde + azeite", qty: "à vontade", kcal: 80 },
      ].map((i) => ({ ...i, kcal: Math.round((i.kcal * r(0.3)) / 590) })),
    },
    {
      id: "prewk",
      name: "Pré-treino",
      time: "17:00",
      ratio: 0.1,
      items: [
        { food: "Batata-doce cozida", qty: "150g", kcal: 130 },
        { food: "Whey ou 2 ovos", qty: "1 dose", kcal: 120 },
      ].map((i) => ({ ...i, kcal: Math.round((i.kcal * r(0.1)) / 250) })),
    },
    {
      id: "jantar",
      name: "Jantar",
      time: "20:00",
      ratio: 0.25,
      items: [
        { food: "Peixe branco ou tofu", qty: "150g", kcal: 220 },
        { food: "Quinoa ou arroz", qty: "3 col. sopa", kcal: 130 },
        { food: "Legumes assados", qty: "1 prato", kcal: 100 },
        { food: "Abacate", qty: "1/4 unidade", kcal: 80 },
      ].map((i) => ({ ...i, kcal: Math.round((i.kcal * r(0.25)) / 530) })),
    },
  ];
};

export function buildMealPlan(kcal: number) {
  return MEAL_TEMPLATE(kcal);
}
