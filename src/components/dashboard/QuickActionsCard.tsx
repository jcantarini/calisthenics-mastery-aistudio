import { memo } from "react";
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

export const QuickActionsCard = memo(function QuickActionsCard() {
  return (
    <DashCard aria-label="Ações rápidas">
      <SectionTitle>Ações rápidas</SectionTitle>
      <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="press flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 p-3 text-center text-[11px] font-semibold leading-tight hover:border-primary/40 hover:bg-background/70"
          >
            <Icon className="h-4.5 w-4.5 text-primary" aria-hidden />
            <span className="truncate max-w-full">{label}</span>
          </Link>
        ))}
      </nav>
    </DashCard>
  );
});
