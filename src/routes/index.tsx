import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, TrendingUp, Trophy, ChevronRight, Zap } from "lucide-react";
import { PROGRAMS, LEVEL_META } from "@/lib/programs";
import { useAppState } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [state] = useAppState();
  const { t, locale } = useT();
  const active = PROGRAMS.find((p) => p.slug === state.activeProgram) ?? PROGRAMS[0];
  const doneThisWeek = state.completedSessions.filter(
    (d) => Date.now() - new Date(d).getTime() < 7 * 86400000,
  ).length;
  const progressPct = Math.min(100, (doneThisWeek / state.weeklyGoal) * 100);
  const localeMap: Record<string, string> = {
    pt: "pt-BR", en: "en-US", it: "it-IT", es: "es-ES", fr: "fr-FR",
  };
  const weekday = new Date().toLocaleDateString(localeMap[locale], { weekday: "long" });
  const avatarInitials = state.profile.initials || "?";

  return (
    <div className="px-5 pt-12">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {weekday}
          </p>
          <h1 className="mt-1 text-display text-4xl">
            {t("home.greeting")}<br />
            <span className="text-primary">{t("home.athlete")}</span>
          </h1>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-full border border-border/60 bg-surface-elevated">
          <span className="text-sm font-bold">{avatarInitials}</span>
        </div>
      </header>

      {/* Streak card */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Flame className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("home.streak")}
              </p>
              <p className="text-2xl font-bold leading-none">
                {state.streak} <span className="text-sm font-normal text-muted-foreground">{t("common.days")}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("common.week")}
            </p>
            <p className="text-2xl font-bold leading-none">
              {doneThisWeek}
              <span className="text-sm font-normal text-muted-foreground">/{state.weeklyGoal}</span>
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Today's workout hero */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">{t("home.todayWorkout")}</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {LEVEL_META[active.level].badge} · {LEVEL_META[active.level].label}
          </span>
        </div>

        <Link
          to="/treinos/$slug"
          params={{ slug: active.slug }}
          className="mt-3 block overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-surface-elevated via-surface to-background p-5 shadow-card transition-transform active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("home.activeProgram")}
              </p>
              <h3 className="mt-1 text-display text-3xl leading-none">{active.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{active.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium">
                  {active.duration}
                </span>
                <span className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium">
                  {active.exercises.length} {t("home.exercises")}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow"
              aria-label={t("home.startWorkout")}
            >
              <Play className="h-6 w-6 fill-current" strokeWidth={0} />
            </button>
          </div>
        </Link>
      </section>

      {/* Stats row */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("home.volume")}
          value="1.240"
          unit={t("home.volumeUnit")}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label={t("home.goals")}
          value={`${state.goals.filter((g) => g.done).length}/${state.goals.length}`}
          unit={t("home.goalsUnit")}
        />
      </section>

      {/* Quick programs */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">{t("home.programs")}</h2>
          <Link to="/treinos" className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("home.seeAll")}
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {PROGRAMS.map((p) => (
            <li key={p.id}>
              <Link
                to="/treinos/$slug"
                params={{ slug: p.slug }}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4 transition-colors active:bg-surface-elevated"
              >
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold"
                  style={{
                    background: `color-mix(in oklab, ${p.color} 18%, transparent)`,
                    color: p.color,
                  }}
                >
                  {LEVEL_META[p.level].badge}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {LEVEL_META[p.level].label}
                  </p>
                  <p className="truncate font-bold">{p.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.weeks} {t("home.weeks")} · {p.daysPerWeek}{t("home.perWeek")} · {p.duration}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Daily tip */}
      <section className="mt-8 rounded-3xl border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-center gap-2 text-accent">
          <Zap className="h-4 w-4" />
          <p className="text-[11px] font-semibold uppercase tracking-widest">{t("home.tip")}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{t("home.tipText")}</p>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-2 text-display text-2xl">{value}</p>
      <p className="text-[11px] text-muted-foreground">{unit}</p>
    </div>
  );
}
