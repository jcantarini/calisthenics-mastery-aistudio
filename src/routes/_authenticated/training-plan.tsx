import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Play,
  Home,
  ListChecks,
  ChevronRight,
  Calendar,
  Target,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { TrainingPlanService } from "@/services/training-plan/TrainingPlanService";
import type { TrainingPlanSummary } from "@/services/training-plan/trainingPlanTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/training-plan")({
  head: () => ({
    meta: [
      { title: "Seu plano de 4 semanas — Barra" },
      { name: "description", content: "Plano personalizado de 4 semanas com progressão semanal." },
      { property: "og:title", content: "Seu plano de 4 semanas — Barra" },
      {
        property: "og:description",
        content: "Plano personalizado de 4 semanas com progressão semanal.",
      },
    ],
  }),
  component: TrainingPlanPage,
});

const MSGS = [
  "Analisando sua avaliação…",
  "Construindo sua progressão…",
  "Montando sua agenda semanal…",
  "Preparando seu programa personalizado…",
  "Quase pronto…",
];

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function TrainingPlanPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<TrainingPlanSummary | null>(null);
  const [phase, setPhase] = useState(0);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    MSGS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setPhase(i), i * 700));
    });

    (async () => {
      try {
        const t0 = Date.now();
        await TrainingPlanService.generateTrainingPlan();
        const sum = await TrainingPlanService.getSummary();
        const min = 2600;
        const elapsed = Date.now() - t0;
        if (elapsed < min) await new Promise((r) => setTimeout(r, min - elapsed));
        setSummary(sum);
        setLoading(false);
      } catch (e) {
        toast.error((e as Error).message);
        navigate({ to: "/" });
      }
    })();
    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  return (
    <div className="min-h-dvh px-5 pb-32 pt-12">
      <AnimatePresence mode="wait">
        {loading ? (
          <Loader key="l" phase={phase} />
        ) : summary ? (
          <Summary key="s" summary={summary} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Loader({ phase }: { phase: number }) {
  const pct = ((phase + 1) / MSGS.length) * 100;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="relative grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow"
      >
        <Calendar className="h-10 w-10" />
        <motion.span
          className="absolute inset-0 rounded-[2rem] border-2 border-primary/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </motion.div>
      <div className="mt-10 w-full max-w-xs">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
          />
        </div>
        <div className="mt-6 h-6 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-sm font-medium text-muted-foreground"
            >
              {MSGS[phase]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Summary({ summary }: { summary: TrainingPlanSummary }) {
  const wk = summary.weekOnePreview;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-md space-y-6"
    >
      <header className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow"
        >
          <Sparkles className="h-9 w-9" />
        </motion.div>
        <h1 className="mt-5 text-3xl font-bold leading-tight">Parabéns!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu plano personalizado de 4 semanas está pronto.
        </p>
      </header>

      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Programa
        </p>
        <p className="mt-1 text-xl font-bold">{summary.programTitle}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat
            icon={<Target className="h-4 w-4" />}
            value={summary.primaryGoal ?? "—"}
            label="Meta"
            small
          />
          <Stat
            icon={<Dumbbell className="h-4 w-4" />}
            value={summary.targetSkill ?? "—"}
            label="Skill"
            small
          />
          <Stat
            icon={<Calendar className="h-4 w-4" />}
            value={`${summary.daysPerWeek}×`}
            label="Semana"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Nível: <b>{summary.fitnessLevel ?? "—"}</b> · Duração:{" "}
          <b>{summary.workoutDurationMin} min</b> · Progresso esperado em 4 semanas.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Prévia — Semana 1
        </h2>
        <div className="rounded-2xl border border-border/60 bg-surface p-4">
          <p className="text-sm font-medium">{wk.objective}</p>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {wk.days.map((d) => (
              <div
                key={d.dayNumber}
                className={cn(
                  "flex flex-col items-center rounded-lg py-2 text-[10px]",
                  d.dayType === "workout"
                    ? "bg-primary/15 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <span>{DAY_LABELS[d.dayNumber - 1]}</span>
                <span className="mt-1 text-[9px]">
                  {d.dayType === "workout" ? "Treino" : "Off"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {wk.workoutDaysCount} treinos · {wk.recoveryDaysCount} recuperações · ~
            {wk.estimatedDurationMin} min totais
          </p>
        </div>
      </section>

      <div className="space-y-2 pt-2">
        <Link
          to="/timer"
          className="tap flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-bold text-primary-foreground shadow-glow"
        >
          <Play className="h-4 w-4" />
          Começar Semana 1
        </Link>
        <Link
          to="/treinos"
          className="tap flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-4 text-sm font-semibold"
        >
          <ListChecks className="h-4 w-4" />
          Ver plano completo
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          to="/"
          className="tap flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-muted-foreground"
        >
          <Home className="h-4 w-4" />
          Ir ao painel
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({
  icon,
  value,
  label,
  small,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-background/60 p-3 text-center">
      <div className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary">
        {icon}
      </div>
      <p className={cn("mt-2 font-bold capitalize", small ? "text-sm" : "text-xl")}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
