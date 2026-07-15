import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplet,
  ChevronRight,
  Info,
  Activity,
  UserCog,
} from "lucide-react";
import { useAppState } from "@/lib/store";
import {
  ACTIVITY_META,
  BMI_META,
  GOAL_META,
  bmi,
  bmiCategory,
  bmr,
  buildMealPlan,
  macrosFor,
  targetCalories,
  tdee,
  type DietGoal,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dieta")({
  head: () => ({
    meta: [
      { title: "Dieta e calorias — Barra" },
      {
        name: "description",
        content:
          "Calcule suas calorias diárias com base no IMC, escolha a estratégia (definição, manutenção ou hipertrofia) e siga um cardápio exemplo com macros.",
      },
    ],
  }),
  component: DietaPage,
});

function DietaPage() {
  const [state, setState] = useAppState();
  const { profile } = state;

  const bmiValue = bmi(profile);
  const bmiCat = bmiCategory(bmiValue);
  const meta = BMI_META[bmiCat];

  const [goal, setGoal] = useState<DietGoal>(meta.suggestedGoal);

  const bmrValue = Math.round(bmr(profile));
  const tdeeValue = Math.round(tdee(profile));
  const kcal = targetCalories(profile, goal);
  const macros = macrosFor(profile, kcal, goal);
  const meals = useMemo(() => buildMealPlan(kcal), [kcal]);

  const waterL = Math.max(2, +(profile.weightKg * 0.035).toFixed(1));

  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Nutrição
        </p>
        <h1 className="mt-1 text-display text-4xl">
          Dieta baseada<br />
          no seu <span className="text-primary">IMC</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Calculamos calorias e macros com Mifflin–St Jeor e adaptamos ao seu objetivo.
        </p>
      </header>

      {/* IMC card */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Seu IMC
            </p>
            <p className="mt-1 text-display text-5xl leading-none">{bmiValue.toFixed(1)}</p>
          </div>
          <div className="text-right">
            <p
              className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
              style={{ borderColor: meta.color, color: meta.color }}
            >
              {meta.label}
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              faixa {meta.range}
            </p>
          </div>
        </div>

        <BmiBar value={bmiValue} />

        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          {meta.note}
        </p>
      </section>

      {/* Activity level */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">Nível de atividade</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            × {ACTIVITY_META[profile.activity].multiplier}
          </span>
        </div>
        <div className="mt-3 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {(Object.keys(ACTIVITY_META) as (keyof typeof ACTIVITY_META)[]).map((k) => {
              const active = profile.activity === k;
              return (
                <button
                  key={k}
                  onClick={() =>
                    setState((s) => ({ ...s, profile: { ...s.profile, activity: k } }))
                  }
                  className={cn(
                    "shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-surface",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-widest",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {ACTIVITY_META[k].label}
                  </p>
                  <p className="mt-0.5 text-xs">{ACTIVITY_META[k].description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Goal */}
      <section className="mt-6">
        <h2 className="text-display text-2xl">Objetivo</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(Object.keys(GOAL_META) as DietGoal[]).map((g) => {
            const active = goal === g;
            const info = GOAL_META[g];
            return (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-all active:scale-95",
                  active ? "border-primary bg-primary/10" : "border-border/60 bg-surface",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {info.label}
                </p>
                <p className="mt-1 font-mono text-sm font-bold">
                  {info.delta === 0 ? "±0%" : `${info.delta > 0 ? "+" : ""}${Math.round(info.delta * 100)}%`}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{GOAL_META[goal].description}</p>
      </section>

      {/* Target calories */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-surface-elevated via-surface to-background p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <Flame className="h-3.5 w-3.5" /> Meta calórica
            </p>
            <p className="mt-1 text-display text-5xl leading-none">
              {kcal.toLocaleString("pt-BR")}
              <span className="ml-2 text-sm font-normal text-muted-foreground">kcal/dia</span>
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <p>TMB {bmrValue}</p>
            <p>Gasto {tdeeValue}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MacroPill
            icon={<Beef className="h-3.5 w-3.5" />}
            label="Proteína"
            value={`${macros.proteinG}g`}
            color="var(--lime)"
          />
          <MacroPill
            icon={<Wheat className="h-3.5 w-3.5" />}
            label="Carboidrato"
            value={`${macros.carbsG}g`}
            color="var(--ember)"
          />
          <MacroPill
            icon={<Droplet className="h-3.5 w-3.5" />}
            label="Gordura"
            value={`${macros.fatG}g`}
            color="oklch(0.75 0.14 220)"
          />
        </div>

        <MacroBar
          protein={macros.proteinG * 4}
          carbs={macros.carbsG * 4}
          fat={macros.fatG * 9}
        />

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Droplet className="h-3 w-3" /> Água {waterL}L/dia
          </span>
          <Link
            to="/perfil"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            <UserCog className="h-3 w-3" /> Ajustar perfil
          </Link>
        </div>
      </section>

      {/* Meal plan */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">Cardápio exemplo</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {meals.length} refeições
          </span>
        </div>
        <ul className="mt-3 space-y-3">
          {meals.map((m) => {
            const total = m.items.reduce((s, i) => s + i.kcal, 0);
            return (
              <li key={m.id} className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
                <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {m.time}
                    </p>
                    <p className="font-bold">{m.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-display text-lg leading-none">{total}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      kcal
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-border/40">
                  {m.items.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.food}</p>
                        <p className="text-xs text-muted-foreground">{i.qty}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {i.kcal} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tips */}
      <section className="mt-8 rounded-3xl border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-center gap-2 text-accent">
          <Activity className="h-4 w-4" />
          <p className="text-[11px] font-semibold uppercase tracking-widest">Princípios</p>
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li className="flex gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Priorize <span className="font-bold">proteína magra</span> em todas as refeições para
            preservar massa muscular.
          </li>
          <li className="flex gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Concentre os <span className="font-bold">carboidratos</span> perto do treino para mais
            energia e recuperação.
          </li>
          <li className="flex gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Fibras, vegetais e água ajudam na saciedade e no rendimento.
          </li>
          <li className="flex gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Estes valores são <span className="font-bold">estimativas</span>. Para prescrição
            individual, consulte um(a) nutricionista.
          </li>
        </ul>
      </section>
    </div>
  );
}

function BmiBar({ value }: { value: number }) {
  // scale 15–40 mapped 0–100%
  const pct = Math.max(0, Math.min(100, ((value - 15) / 25) * 100));
  return (
    <div className="mt-5">
      <div className="relative h-2 overflow-hidden rounded-full">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, var(--ember) 0 14%, var(--lime) 14% 40%, var(--ember) 40% 60%, var(--destructive) 60% 100%)",
          }}
        />
        <div
          className="absolute -top-1 h-4 w-1 rounded-sm bg-foreground shadow-glow"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
    </div>
  );
}

function MacroPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: `color-mix(in oklab, ${color} 30%, transparent)`,
        background: `color-mix(in oklab, ${color} 8%, transparent)`,
      }}
    >
      <div className="flex items-center gap-1" style={{ color }}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 text-display text-lg leading-none">{value}</p>
    </div>
  );
}

function MacroBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const total = protein + carbs + fat || 1;
  return (
    <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-background/60">
      <div style={{ width: `${(protein / total) * 100}%`, background: "var(--lime)" }} />
      <div style={{ width: `${(carbs / total) * 100}%`, background: "var(--ember)" }} />
      <div style={{ width: `${(fat / total) * 100}%`, background: "oklch(0.75 0.14 220)" }} />
    </div>
  );
}
