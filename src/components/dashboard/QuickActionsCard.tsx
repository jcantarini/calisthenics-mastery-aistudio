import { Link } from "@tanstack/react-router";
import { BarChart3, Dumbbell, ListChecks, Play, Target } from "lucide-react";
import { DashCard, SectionTitle } from "./primitives";

const ACTIONS = [
  { to: "/timer", label: "Iniciar treino", icon: Play },
  { to: "/training-plan", label: "Ver programa", icon: ListChecks },
  { to: "/relatorio", label: "Histórico", icon: BarChart3 },
  { to: "/progresso", label: "Metas", icon: Target },
  { to: "/treinos", label: "Exercícios", icon: Dumbbell },
] as const;

export function QuickActionsCard() {
  return (
    <DashCard aria-label="Ações rápidas">
      <SectionTitle>Ações rápidas</SectionTitle>
      <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="tap flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-background/40 p-3 text-center text-[11px] font-semibold transition-colors hover:border-primary/40"
          >
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </DashCard>
  );
}
