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
  Check,
  Minus,
  Plus,
  BookOpen,
  RotateCcw,
  Bell,
  BellOff,
} from "lucide-react";
import { requestNotifPermission, useNotifPermission } from "@/lib/reminders";
import { useAppState, todayKey, type DietDayLog } from "@/lib/store";
import { useT } from "@/lib/i18n";
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
  const waterGoalMl = Math.round(waterL * 1000);

  // Diary state
  const today = todayKey();
  const todayLog: DietDayLog = state.dietLog[today] ?? { meals: {}, waterMl: 0 };
  const doneMealIds = meals.filter((m) => todayLog.meals[m.id]);
  const kcalConsumed = doneMealIds.reduce(
    (s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0),
    0,
  );
  const kcalBurnedToday = (state.workoutLog[today] ?? []).reduce(
    (s, w) => s + w.kcalBurned,
    0,
  );
  const workoutsToday = state.workoutLog[today] ?? [];
  const netKcal = kcalConsumed - kcalBurnedToday;
  const kcalPct = Math.min(100, Math.round((kcalConsumed / kcal) * 100));
  const waterPct = Math.min(100, Math.round((todayLog.waterMl / waterGoalMl) * 100));

  const updateToday = (patch: Partial<DietDayLog>) => {
    setState((s) => {
      const prev = s.dietLog[today] ?? { meals: {}, waterMl: 0 };
      return {
        ...s,
        dietLog: {
          ...s.dietLog,
          [today]: { ...prev, ...patch, kcalTarget: kcal },
        },
      };
    });
  };

  const toggleMeal = (id: string) => {
    updateToday({ meals: { ...todayLog.meals, [id]: !todayLog.meals[id] } });
  };
  const addWater = (ml: number) => {
    updateToday({ waterMl: Math.max(0, todayLog.waterMl + ml) });
  };
  const resetToday = () => updateToday({ meals: {}, waterMl: 0 });

  // Week summary (last 7 days including today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = todayKey(d);
    const log = state.dietLog[key];
    const dayMeals = buildMealPlan(log?.kcalTarget ?? kcal);
    const kcalDone = log
      ? dayMeals
          .filter((m) => log.meals[m.id])
          .reduce((s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0), 0)
      : 0;
    return {
      key,
      date: d,
      isToday: key === today,
      kcalDone,
      kcalTarget: log?.kcalTarget ?? kcal,
      waterMl: log?.waterMl ?? 0,
    };
  });
  const weekKcalAvg = Math.round(
    week.reduce((s, d) => s + d.kcalDone, 0) / week.filter((d) => d.kcalDone > 0).length || 0,
  );
  const weekWaterAvg = Math.round(
    week.reduce((s, d) => s + d.waterMl, 0) / week.filter((d) => d.waterMl > 0).length || 0,
  );

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
        <p className="mt-1 text-xs text-muted-foreground">
          Toque no círculo para marcar a refeição como feita e acompanhar no diário.
        </p>
        <ul className="mt-3 space-y-3">
          {meals.map((m) => {
            const total = m.items.reduce((s, i) => s + i.kcal, 0);
            const done = !!todayLog.meals[m.id];
            return (
              <li
                key={m.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-surface transition-colors",
                  done ? "border-primary/60" : "border-border/60",
                )}
              >
                <div className="flex items-center gap-3 border-b border-border/60 bg-background/40 px-4 py-3">
                  <button
                    onClick={() => toggleMeal(m.id)}
                    aria-pressed={done}
                    aria-label={`Marcar ${m.name} como feita`}
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all active:scale-90",
                      done
                        ? "border-primary bg-primary text-primary-foreground shadow-glow"
                        : "border-border/70 bg-background",
                    )}
                  >
                    {done && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {m.time}
                    </p>
                    <p className={cn("font-bold", done && "line-through opacity-60")}>
                      {m.name}
                    </p>
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

      {/* Diary — today */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-display text-2xl">Diário de hoje</h2>
          </div>
          <button
            onClick={resetToday}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground active:scale-95"
          >
            <RotateCcw className="h-3 w-3" /> Zerar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Calories today */}
          <div className="rounded-2xl border border-border/60 bg-surface-elevated p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Flame className="h-3 w-3" /> Calorias
            </div>
            <p className="mt-2 text-display text-2xl leading-none">
              {kcalConsumed}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {kcal}
              </span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${kcalPct}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {doneMealIds.length}/{meals.length} refeições
            </p>
          </div>

          {/* Water today */}
          <div className="rounded-2xl border border-border/60 bg-surface-elevated p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.75 0.14 220)" }}>
              <Droplet className="h-3 w-3" /> Água
            </div>
            <p className="mt-2 text-display text-2xl leading-none">
              {(todayLog.waterMl / 1000).toFixed(1)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {waterL}L
              </span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${waterPct}%`, background: "oklch(0.75 0.14 220)" }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => addWater(-250)}
                aria-label="Remover 250ml"
                className="grid h-7 w-7 place-items-center rounded-full border border-border/60 bg-background active:scale-90"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                250 ml
              </span>
              <button
                onClick={() => addWater(250)}
                aria-label="Adicionar 250ml"
                className="grid h-7 w-7 place-items-center rounded-full border border-primary bg-primary/10 text-primary active:scale-90"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Workout burn today */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--ember) 15%, transparent)", color: "var(--ember)" }}
          >
            <Flame className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Queimadas no treino
            </p>
            <p className="text-sm">
              <span className="font-bold" style={{ color: "var(--ember)" }}>
                {kcalBurnedToday}
              </span>{" "}
              <span className="text-xs text-muted-foreground">
                kcal · {workoutsToday.length} sessão(ões) · saldo{" "}
                <span className={netKcal < 0 ? "text-primary" : ""}>
                  {netKcal > 0 ? "+" : ""}
                  {netKcal}
                </span>
              </span>
            </p>
          </div>
          <Link
            to="/relatorio"
            className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            Relatório
          </Link>
        </div>
      </section>

      {/* Reminders */}
      <RemindersCard />




      {/* Weekly summary */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">Sua semana</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            últimos 7 dias
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Média calórica
            </p>
            <p className="mt-1 text-display text-xl leading-none">
              {weekKcalAvg || 0}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Média de água
            </p>
            <p className="mt-1 text-display text-xl leading-none">
              {((weekWaterAvg || 0) / 1000).toFixed(1)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">L</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-surface-elevated p-4">
          <div className="flex items-end justify-between gap-1">
            {week.map((d) => {
              const kPct = Math.min(100, Math.round((d.kcalDone / d.kcalTarget) * 100));
              const wPct = Math.min(100, Math.round((d.waterMl / waterGoalMl) * 100));
              const label = d.date.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3);
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-24 w-full items-end gap-0.5">
                    <div
                      className="flex-1 rounded-t bg-primary/80 transition-all"
                      style={{ height: `${Math.max(4, kPct)}%` }}
                      title={`${d.kcalDone} kcal`}
                    />
                    <div
                      className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${Math.max(4, wPct)}%`,
                        background: "oklch(0.75 0.14 220 / 0.85)",
                      }}
                      title={`${(d.waterMl / 1000).toFixed(1)}L`}
                    />
                  </div>
                  <p
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-widest",
                      d.isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-primary/80" /> Calorias
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: "oklch(0.75 0.14 220 / 0.85)" }}
              />
              Água
            </span>
          </div>
        </div>
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

function RemindersCard() {
  const [state, setState] = useAppState();
  const [perm, setPerm] = useNotifPermission();
  const r = state.reminders;

  const setR = (patch: Partial<typeof r>) =>
    setState((s) => ({ ...s, reminders: { ...s.reminders, ...patch } }));

  const enable = async () => {
    let p = perm;
    if (p !== "granted") {
      p = await requestNotifPermission();
      setPerm(p);
    }
    if (p === "granted") {
      setR({ enabled: true });
      try {
        new Notification("Lembretes ativados", {
          body: "Vamos te avisar nas refeições e para beber água.",
          icon: "/icon-192.png",
        });
      } catch {}
    }
  };

  const disable = () => setR({ enabled: false });

  const unsupported = perm === "unsupported";
  const denied = perm === "denied";
  const on = r.enabled && perm === "granted";

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-display text-2xl">Lembretes</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Avisos para marcar refeições e registrar água. Instale o app na tela inicial do
        celular para receber com o app fechado.
      </p>

      <div
        className={cn(
          "mt-3 overflow-hidden rounded-3xl border p-4 transition-colors",
          on ? "border-primary/40 bg-primary/5" : "border-border/60 bg-surface",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-xl",
              on ? "bg-primary text-primary-foreground shadow-glow" : "bg-background/60 text-muted-foreground",
            )}
          >
            {on ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">
              {on ? "Lembretes ativos" : "Lembretes desativados"}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {unsupported
                ? "não suportado neste navegador"
                : denied
                  ? "permissão bloqueada nas configurações"
                  : perm === "granted"
                    ? "permissão concedida"
                    : "permissão pendente"}
            </p>
          </div>
          {on ? (
            <button
              onClick={disable}
              className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground active:scale-95"
            >
              Desativar
            </button>
          ) : (
            <button
              onClick={enable}
              disabled={unsupported || denied}
              className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground shadow-glow active:scale-95 disabled:opacity-50"
            >
              {denied ? "Bloqueado" : "Ativar"}
            </button>
          )}
        </div>

        {denied && (
          <p className="mt-3 rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
            Para liberar, abra as configurações do site no navegador e permita notificações.
          </p>
        )}

        {on && (
          <div className="mt-4 space-y-3">
            <ReminderToggle
              label="Nas horas das refeições"
              hint="Toca no horário de cada refeição do cardápio, se ainda não marcada."
              value={r.meals}
              onChange={(v) => setR({ meals: v })}
            />
            <ReminderToggle
              label="Beber água"
              hint="Só quando você ainda não bateu a meta diária."
              value={r.water}
              onChange={(v) => setR({ water: v })}
            />
            {r.water && (
              <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      A cada
                    </p>
                    <p className="text-display text-xl leading-none">
                      {r.waterEveryMin}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">min</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setR({ waterEveryMin: Math.max(30, r.waterEveryMin - 30) })}
                      aria-label="Diminuir intervalo"
                      className="grid h-8 w-8 place-items-center rounded-full border border-border/60 active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setR({ waterEveryMin: Math.min(360, r.waterEveryMin + 30) })}
                      aria-label="Aumentar intervalo"
                      className="grid h-8 w-8 place-items-center rounded-full border border-primary bg-primary/10 text-primary active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <TimeField
                    label="Início"
                    value={r.waterFrom}
                    onChange={(v) => setR({ waterFrom: v })}
                  />
                  <TimeField
                    label="Fim"
                    value={r.waterTo}
                    onChange={(v) => setR({ waterTo: v })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ReminderToggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 text-left active:scale-[0.99]"
    >
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          value ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all",
            value ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

