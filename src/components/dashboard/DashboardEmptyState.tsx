import { Link } from "@tanstack/react-router";
import { ClipboardCheck, PartyPopper, Sparkles } from "lucide-react";
import { DashCard } from "./primitives";

/** No active program yet: send the user through assessment → generation. */
export function DashboardEmptyState({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating?: boolean;
}) {
  return (
    <DashCard className="border-primary/30 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <ClipboardCheck className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-display text-2xl">Você ainda não tem um programa</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Faça a avaliação física e geramos um plano de 4 semanas personalizado para o seu nível.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/assessment"
          className="tap inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
        >
          Fazer avaliação
        </Link>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="tap inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-semibold disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {generating ? "Gerando…" : "Gerar primeiro programa"}
        </button>
      </div>
    </DashCard>
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
    <DashCard className="border-accent/40 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
        <PartyPopper className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-display text-2xl">Parabéns, programa concluído!</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Você finalizou todas as semanas. Gere o próximo ciclo para continuar evoluindo.
      </p>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={generating}
        className="tap mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {generating ? "Gerando…" : "Gerar próximo programa"}
      </button>
    </DashCard>
  );
}
