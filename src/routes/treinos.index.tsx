import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Clock, Calendar, Target, Dumbbell, Heart, Shield, Timer } from "lucide-react";
import { PROGRAMS, LEVEL_META, type Level, type Category } from "@/lib/programs";
import { useT } from "@/lib/i18n";
import { tLevel, tCategory, tProgram } from "@/lib/content-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/treinos/")({
  head: () => ({
    meta: [
      { title: "Programas de treino — Barra" },
      {
        name: "description",
        content:
          "Programas de calistenia, cardio e treino militar do iniciante ao avançado, com vídeos e progressões guiadas.",
      },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const { t, locale } = useT();
  const [level, setLevel] = useState<Level | "todos">("todos");
  const [category, setCategory] = useState<Category | "todas">("todas");

  const LEVEL_FILTERS: { key: Level | "todos"; label: string }[] = [
    { key: "todos", label: t("treinos.filter.all") },
    { key: "iniciante", label: t("treinos.filter.beginner") },
    { key: "intermediario", label: t("treinos.filter.intermediate") },
    { key: "avancado", label: t("treinos.filter.advanced") },
  ];

  const CATEGORY_FILTERS: { key: Category | "todas"; label: string; icon: typeof Dumbbell }[] = [
    { key: "todas", label: t("treinos.filter.allFem"), icon: Target },
    { key: "calistenia", label: t("treinos.cat.calistenia"), icon: Dumbbell },
    { key: "cardio", label: t("treinos.cat.cardio"), icon: Heart },
    { key: "militar", label: t("treinos.cat.militar"), icon: Shield },
  ];

  const list = PROGRAMS.filter(
    (p) => (level === "todos" || p.level === level) && (category === "todas" || p.category === category),
  );

  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("treinos.eyebrow")}
        </p>
        <h1 className="mt-1 text-display text-4xl">
          {t("treinos.title1")}<br />
          <span className="text-primary">{t("treinos.title2")}</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("treinos.intro")}</p>

        <Link
          to="/timer"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-left transition-colors active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Timer className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">{t("treinos.timer")}</span>
            <span className="block text-[11px] text-muted-foreground">{t("treinos.timerSub")}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </header>

      <div className="mt-6 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {CATEGORY_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = category === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setCategory(f.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setLevel(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors",
                level === f.key
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <p className="mt-8 rounded-2xl border border-border/60 bg-surface p-6 text-center text-sm text-muted-foreground">
          {t("treinos.empty")}
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {list.map((p) => (
          <li key={p.id}>
            <Link
              to="/treinos/$slug"
              params={{ slug: p.slug }}
              className="block overflow-hidden rounded-3xl border border-border/60 bg-surface transition-transform active:scale-[0.98]"
            >
              <div
                className="relative h-32 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, color-mix(in oklab, ${p.color} 35%, transparent), color-mix(in oklab, ${p.color} 5%, transparent))`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,transparent_40%,var(--background)_100%)]" />
                <div className="absolute left-5 top-5">
                  <p
                    className="font-mono text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: p.color }}
                  >
                    {LEVEL_META[p.level].badge} · {LEVEL_META[p.level].label} · {CATEGORY_META[p.category].label}
                  </p>
                  <h3 className="mt-1 text-display text-3xl leading-none">{p.title}</h3>
                </div>
                <div
                  className="absolute right-5 top-5 text-display text-6xl opacity-20"
                  style={{ color: p.color }}
                >
                  {LEVEL_META[p.level].badge}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <Meta icon={<Calendar className="h-3 w-3" />} value={`${p.weeks} ${t("treinos.weeks")}`} />
                  <Meta icon={<Clock className="h-3 w-3" />} value={p.duration} />
                  <Meta icon={<Target className="h-3 w-3" />} value={`${p.daysPerWeek}${t("treinos.perWeek")}`} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {t("treinos.start")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 text-muted-foreground">
      {icon}
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
