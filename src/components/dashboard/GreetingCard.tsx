import { Sparkles } from "lucide-react";
import type { FitnessLevel, PrimaryGoal } from "@/lib/onboarding";
import { DashCard, Pill } from "./primitives";
import { greetingFor } from "./dashboardFormat";

const LEVEL_LABEL: Record<FitnessLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

const GOAL_LABEL: Record<PrimaryGoal, string> = {
  muscle: "Ganhar músculo",
  fat: "Perder gordura",
  strength: "Ganhar força",
  endurance: "Resistência",
  skills: "Habilidades",
  fitness: "Condicionamento",
};

export function GreetingCard({
  name,
  initials,
  level,
  programTitle,
  goal,
}: {
  name: string;
  initials: string;
  level?: FitnessLevel | null;
  programTitle?: string | null;
  goal?: PrimaryGoal | null;
}) {
  return (
    <DashCard as="header" className="bg-gradient-to-br from-surface-elevated via-surface to-background">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {greetingFor()}
          </p>
          <h1 className="mt-1 truncate text-display text-3xl sm:text-4xl">
            {name || "Atleta"}
          </h1>
        </div>
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border/60 bg-background/50"
          aria-hidden
        >
          <span className="text-sm font-bold">{initials || "?"}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {level ? <Pill>{LEVEL_LABEL[level]}</Pill> : null}
        {programTitle ? (
          <Pill className="border-primary/40 text-primary">{programTitle}</Pill>
        ) : null}
        {goal ? (
          <Pill className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" aria-hidden /> {GOAL_LABEL[goal]}
          </Pill>
        ) : null}
      </div>
    </DashCard>
  );
}
