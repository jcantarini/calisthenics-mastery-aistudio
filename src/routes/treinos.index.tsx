import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Clock, Calendar, Target, Dumbbell, Heart, Shield } from "lucide-react";
import { PROGRAMS, LEVEL_META, CATEGORY_META, type Level, type Category } from "@/lib/programs";
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

const LEVEL_FILTERS: { key: Level | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "iniciante", label: "Iniciante" },
  { key: "intermediario", label: "Intermediário" },
  { key: "avancado", label: "Avançado" },
];

const CATEGORY_FILTERS: { key: Category | "todas"; label: string; icon: typeof Dumbbell }[] = [
  { key: "todas", label: "Todas", icon: Target },
  { key: "calistenia", label: "Calistenia", icon: Dumbbell },
  { key: "cardio", label: "Cardio", icon: Heart },
  { key: "militar", label: "Militar", icon: Shield },
];

function TreinosPage() {
  const [level, setLevel] = useState<(typeof LEVEL_FILTERS)[number]["key"]>("todos");
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]["key"]>("todas");
  const list = PROGRAMS.filter(
    (p) => (level === "todos" || p.level === level) && (category === "todas" || p.category === category),
  );

  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Biblioteca
        </p>
        <h1 className="mt-1 text-display text-4xl">
          Programas de<br />
          <span className="text-primary">calistenia</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Três trilhas progressivas. Escolha onde você está hoje e evolua com clareza.
        </p>
      </header>

      {/* Filter chips */}
      <div className="mt-6 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
                    {LEVEL_META[p.level].badge} · {LEVEL_META[p.level].label}
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
                  <Meta icon={<Calendar className="h-3 w-3" />} value={`${p.weeks} sem`} />
                  <Meta icon={<Clock className="h-3 w-3" />} value={p.duration} />
                  <Meta icon={<Target className="h-3 w-3" />} value={`${p.daysPerWeek}×/sem`} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Começar programa
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
