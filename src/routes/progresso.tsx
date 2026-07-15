import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, TrendingUp, Award, Flame, ChevronRight, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso e metas — Barra" },
      {
        name: "description",
        content: "Acompanhe seu histórico de treinos, metas e conquistas na calistenia.",
      },
    ],
  }),
  component: ProgressoPage,
});

function ProgressoPage() {
  const [state, setState] = useAppState();
  const [newGoal, setNewGoal] = useState("");

  const doneSet = new Set(
    state.completedSessions.map((d) => new Date(d).toDateString()),
  );

  // last 35 days heatmap
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    return d;
  });

  const toggleGoal = (id: string) =>
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
    }));

  const addGoal = () => {
    const label = newGoal.trim();
    if (!label) return;
    setState((s) => ({
      ...s,
      goals: [...s.goals, { id: `g${Date.now()}`, label, done: false }],
    }));
    setNewGoal("");
  };

  return (
    <div className="px-5 pt-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Seu caminho
        </p>
        <h1 className="mt-1 text-display text-4xl">
          Progresso &<br />
          <span className="text-primary">metas</span>
        </h1>
      </header>

      <Link
        to="/relatorio"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 transition-colors active:scale-[0.99]"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
          <BarChart3 className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold">Relatório semanal</span>
          <span className="block text-[11px] text-muted-foreground">
            Treinos, calorias, água e adesão
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Big stats */}
      <section className="mt-6 grid grid-cols-3 gap-3">
        <BigStat icon={<Flame className="h-4 w-4" />} value={state.streak} label="dias" sub="sequência" />
        <BigStat
          icon={<TrendingUp className="h-4 w-4" />}
          value={state.completedSessions.length}
          label="sessões"
          sub="total"
        />
        <BigStat
          icon={<Award className="h-4 w-4" />}
          value={state.goals.filter((g) => g.done).length}
          label="metas"
          sub="batidas"
        />
      </section>

      {/* Heatmap */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-display text-2xl">Últimos 5 semanas</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {doneSet.size} ativos
          </span>
        </div>
        <div className="mt-4 rounded-3xl border border-border/60 bg-surface p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const active = doneSet.has(d.toDateString());
              const today = d.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-md border transition-colors",
                    active
                      ? "border-primary/60 bg-primary/70"
                      : "border-border/40 bg-background/40",
                    today && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                  title={d.toLocaleDateString("pt-BR")}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-1">
              <span className="h-2 w-4 rounded-sm bg-background/60" />
              <span className="h-2 w-4 rounded-sm bg-primary/30" />
              <span className="h-2 w-4 rounded-sm bg-primary/60" />
              <span className="h-2 w-4 rounded-sm bg-primary" />
            </div>
            <span>Mais</span>
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="mt-8">
        <h2 className="text-display text-2xl">Metas</h2>
        <ul className="mt-3 space-y-2">
          {state.goals.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => toggleGoal(g.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                  g.done
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-surface",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
                    g.done ? "border-primary bg-primary text-primary-foreground" : "border-border/60",
                  )}
                >
                  {g.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    g.done && "text-muted-foreground line-through",
                  )}
                >
                  {g.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addGoal();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Nova meta (ex: 1 pull-up)"
            className="flex-1 rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow active:scale-95"
            aria-label="Adicionar meta"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </form>
      </section>
    </div>
  );
}

function BigStat({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="text-muted-foreground">{icon}</div>
      <p className="mt-3 text-display text-3xl leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label} · {sub}
      </p>
    </div>
  );
}
