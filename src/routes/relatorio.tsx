import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Flame,
  Droplet,
  Dumbbell,
  Clock,
  Utensils,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useAppState, todayKey } from "@/lib/store";
import {
  BMI_META,
  bmi,
  bmiCategory,
  buildMealPlan,
  targetCalories,
} from "@/lib/nutrition";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório semanal — Barra" },
      {
        name: "description",
        content:
          "Relatório semanal de treinos e dieta: sessões, calorias queimadas e consumidas, hidratação e adesão ao cardápio.",
      },
    ],
  }),
  component: RelatorioPage,
});

function RelatorioPage() {
  const [state] = useAppState();
  const { t, locale } = useT();
  const { profile } = state;
  const localeMap: Record<string, string> = {
    pt: "pt-BR", en: "en-US", it: "it-IT", es: "es-ES", fr: "fr-FR",
  };

  const bmiValue = bmi(profile);
  const bmiCat = bmiCategory(bmiValue);
  const goal = BMI_META[bmiCat].suggestedGoal;
  const kcalTargetDefault = targetCalories(profile, goal);
  const waterGoalMl = Math.round(Math.max(2, profile.weightKg * 0.035) * 1000);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = todayKey(d);
      const dietLog = state.dietLog[key];
      const kcalTarget = dietLog?.kcalTarget ?? kcalTargetDefault;
      const plan = buildMealPlan(kcalTarget);
      const totalMeals = plan.length;
      const doneMeals = dietLog
        ? plan.filter((m) => dietLog.meals[m.id]).length
        : 0;
      const kcalIn = dietLog
        ? plan
            .filter((m) => dietLog.meals[m.id])
            .reduce((s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0), 0)
        : 0;
      const workouts = state.workoutLog[key] ?? [];
      const kcalOut = workouts.reduce((s, w) => s + w.kcalBurned, 0);
      const workoutSec = workouts.reduce((s, w) => s + w.durationSec, 0);
      return {
        key,
        date: d,
        isToday: key === todayKey(),
        kcalTarget,
        kcalIn,
        kcalOut,
        waterMl: dietLog?.waterMl ?? 0,
        totalMeals,
        doneMeals,
        workouts: workouts.length,
        workoutSec,
      };
    });
  }, [state.dietLog, state.workoutLog, kcalTargetDefault]);

  const trainDays = week.filter((d) => d.workouts > 0).length;
  const totalWorkouts = week.reduce((s, d) => s + d.workouts, 0);
  const totalKcalOut = week.reduce((s, d) => s + d.kcalOut, 0);
  const totalMin = Math.round(week.reduce((s, d) => s + d.workoutSec, 0) / 60);
  const avgKcalIn = Math.round(
    week.reduce((s, d) => s + d.kcalIn, 0) /
      Math.max(1, week.filter((d) => d.kcalIn > 0).length),
  );
  const avgWater = Math.round(
    week.reduce((s, d) => s + d.waterMl, 0) /
      Math.max(1, week.filter((d) => d.waterMl > 0).length),
  );
  const totalPlanned = week.reduce((s, d) => s + d.totalMeals, 0);
  const totalDoneMeals = week.reduce((s, d) => s + d.doneMeals, 0);
  const mealAdherence = totalPlanned
    ? Math.round((totalDoneMeals / totalPlanned) * 100)
    : 0;

  const maxBar = Math.max(
    1,
    ...week.map((d) => Math.max(d.kcalIn, d.kcalOut, d.kcalTarget)),
  );

  const allSessions = week
    .flatMap((d) => (state.workoutLog[d.key] ?? []).map((s) => ({ ...s, dayKey: d.key })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="px-5 pt-12 pb-4">
      <div className="flex items-center justify-between">
        <Link
          to="/progresso"
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/60 backdrop-blur"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {t("common.last7")}
        </span>
      </div>

      <header className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("report.eyebrow")}
        </p>
        <h1 className="mt-1 text-display text-4xl">
          {t("report.title1")} <span className="text-primary">{t("report.title2")}</span>
        </h1>
      </header>

      {/* KPIs */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Dumbbell className="h-4 w-4" />}
          value={totalWorkouts}
          label={t("report.kpi.workouts")}
          sub={`${trainDays}${t("report.kpi.days")}`}
          color="var(--lime)"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          value={totalMin}
          label={t("report.kpi.minActive")}
          sub={`${t("report.kpi.goal")} ${state.weeklyGoal}× / ${t("home.weeks")}`}
          color="oklch(0.75 0.14 220)"
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          value={totalKcalOut}
          label={t("report.kpi.kcalBurned")}
          sub={`${t("report.kpi.avg")} ${Math.round(totalKcalOut / 7)}${t("report.kpi.perDay")}`}
          color="var(--ember)"
        />
        <KpiCard
          icon={<Utensils className="h-4 w-4" />}
          value={`${mealAdherence}%`}
          label={t("report.kpi.adhesion")}
          sub={`${totalDoneMeals}/${totalPlanned} ${t("report.kpi.meals")}`}
          color="var(--lime)"
        />
      </section>

      {/* Balance chart */}
      <section className="mt-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-display text-2xl">{t("report.balance")}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("report.balanceSub")}</p>
        <div className="mt-4 rounded-3xl border border-border/60 bg-surface p-4">
          <div className="flex h-40 items-end justify-between gap-1">
            {week.map((d) => {
              const inPct = (d.kcalIn / maxBar) * 100;
              const outPct = (d.kcalOut / maxBar) * 100;
              const targetPct = (d.kcalTarget / maxBar) * 100;
              const label = d.date
                .toLocaleDateString(localeMap[locale], { weekday: "short" })
                .slice(0, 3);
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-32 w-full items-end gap-0.5">
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-border/70"
                      style={{ bottom: `${targetPct}%` }}
                      title={`meta ${d.kcalTarget} kcal`}
                    />
                    <div
                      className="flex-1 rounded-t bg-primary/80"
                      style={{ height: `${Math.max(2, inPct)}%` }}
                      title={`${d.kcalIn} kcal ingeridos`}
                    />
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: `${Math.max(2, outPct)}%`,
                        background: "var(--ember)",
                      }}
                      title={`${d.kcalOut} kcal queimadas`}
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
            <Legend color="var(--primary)" label={t("report.legend.intake")} />
            <Legend color="var(--ember)" label={t("report.legend.burn")} />
            <Legend color="var(--border)" label={t("report.legend.goal")} dashed />
          </div>
        </div>
      </section>

      {/* Diet averages */}
      <section className="mt-8">
        <h2 className="text-display text-2xl">{t("report.diet")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            icon={<Flame className="h-3.5 w-3.5" />}
            label={t("report.avgIntake")}
            value={`${avgKcalIn}`}
            suffix="kcal"
            color="var(--primary)"
          />
          <StatCard
            icon={<Droplet className="h-3.5 w-3.5" />}
            label={t("report.hydration")}
            value={`${(avgWater / 1000).toFixed(1)}`}
            suffix={`L / ${(waterGoalMl / 1000).toFixed(1)}L`}
            color="oklch(0.75 0.14 220)"
          />
        </div>

        <div className="mt-4 rounded-3xl border border-border/60 bg-surface-elevated p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("report.dailyAdhesion")}
          </p>
          <ul className="mt-3 space-y-2">
            {week.map((d) => {
              const pct = d.totalMeals
                ? Math.round((d.doneMeals / d.totalMeals) * 100)
                : 0;
              const label = d.date.toLocaleDateString(localeMap[locale], {
                weekday: "short",
                day: "2-digit",
              });
              return (
                <li key={d.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-20 font-mono text-[10px] uppercase tracking-widest",
                      d.isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-background/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-[11px] text-muted-foreground">
                    {d.doneMeals}/{d.totalMeals}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Sessions list */}
      <section className="mt-8">
        <h2 className="text-display text-2xl">Sessões registradas</h2>
        {allSessions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border/60 bg-surface p-6 text-center text-sm text-muted-foreground">
            Nenhum treino registrado esta semana. Termine um timer para adicionar aqui.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {allSessions.map((s) => {
              const d = new Date(s.at);
              const day = d.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              });
              const time = d.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{s.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {day} · {time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-muted-foreground">
                      {Math.round(s.durationSec / 60)} min
                    </p>
                    <p className="text-display text-base leading-none text-ember">
                      {s.kcalBurned}{" "}
                      <span className="text-[9px] font-normal text-muted-foreground">kcal</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  value,
  label,
  sub,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        background: `color-mix(in oklab, ${color} 8%, transparent)`,
      }}
    >
      <div style={{ color }}>{icon}</div>
      <p className="mt-2 text-display text-3xl leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <p className="mt-2 text-display text-2xl leading-none">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn("h-2 w-4 rounded-sm", dashed && "border border-dashed")}
        style={dashed ? { borderColor: "var(--border)" } : { background: color }}
      />
      {label}
    </span>
  );
}
