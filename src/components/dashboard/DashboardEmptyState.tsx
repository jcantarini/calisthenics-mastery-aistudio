import { Link } from "@tanstack/react-router";
import { ClipboardCheck, PartyPopper, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ActionButton, DashCard, actionClasses } from "./primitives";

/** Shared shell so every empty state reads with the same rhythm. */
function EmptyShell({
  tone,
  icon,
  title,
  description,
  children,
}: {
  tone: "primary" | "accent";
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <DashCard className={tone === "primary" ? "border-primary/30" : "border-accent/40"}>
      <div className="mx-auto max-w-md text-center">
        <div
          className={`relative mx-auto grid h-16 w-16 place-items-center rounded-3xl ${
            tone === "primary" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
          }`}
          aria-hidden
        >
          <span
            className={`absolute inset-0 rounded-3xl ${
              tone === "primary" ? "bg-primary/10" : "bg-accent/10"
            } blur-xl`}
          />
          <span className="relative">{icon}</span>
        </div>
        <h2 className="mt-5 text-display text-2xl text-balance">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground text-balance">
          {description}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
      </div>
    </DashCard>
  );
}

/** No active program yet: send the user through assessment → generation. */
export function DashboardEmptyState({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating?: boolean;
}) {
  return (
    <EmptyShell
      tone="primary"
      icon={<ClipboardCheck className="h-7 w-7" aria-hidden />}
      title="Você ainda não tem um programa"
      description="Faça a avaliação física e geramos um plano de 4 semanas personalizado para o seu nível."
    >
      <Link to="/assessment" className={actionClasses("primary")}>
        Fazer avaliação
      </Link>
      <ActionButton
        variant="outline"
        onClick={onGenerate}
        disabled={generating}
        className="min-h-13 rounded-2xl px-5 text-sm"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {generating ? "Gerando…" : "Gerar primeiro programa"}
      </ActionButton>
    </EmptyShell>
  );
}

/** Program finished: celebrate and offer the next cycle. */
export function ProgramCompletedState({
  onRegenerate,
  generating,
}: {
  onRegenerate: () => void;
  generating?: boolean;
}) {
  return (
    <EmptyShell
      tone="accent"
      icon={<PartyPopper className="h-7 w-7 animate-celebrate" aria-hidden />}
      title="Parabéns, programa concluído!"
      description="Você finalizou todas as semanas. Gere o próximo ciclo para continuar evoluindo."
    >
      <ActionButton variant="primary" onClick={onRegenerate} disabled={generating}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {generating ? "Gerando…" : "Gerar próximo programa"}
      </ActionButton>
    </EmptyShell>
  );
}
