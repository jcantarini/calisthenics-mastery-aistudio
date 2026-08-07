import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Play,
  Home,
  ListChecks,
  Flame,
  Clock,
  Dumbbell,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchOnboarding } from "@/lib/onboarding";
import { WorkoutGeneratorService } from "@/services/workout-generator/WorkoutGeneratorService";
import type { GeneratedWorkout } from "@/services/workout-generator/workoutTypes";
import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/first-workout")({
  head: () => ({
    meta: [
      { title: "Seu primeiro treino personalizado — Barra" },
      {
        name: "description",
        content:
          "Treino gerado automaticamente a partir da sua avaliação física, com aquecimento, exercícios, sets, repetições e desaquecimento.",
      },
    ],
  }),
  component: FirstWorkoutPage,
});

/* --------------------------- i18n --------------------------- */

type Dict = Record<string, string>;
const STRINGS: Record<Locale, Dict> = {
  pt: {
    l1: "Analisando sua avaliação…",
    l2: "Selecionando exercícios adequados…",
    l3: "Ajustando séries e descanso…",
    l4: "Finalizando seu treino…",
    ready: "Seu primeiro treino está pronto!",
    congrats: "Parabéns! Personalizamos tudo com base na sua avaliação.",
    program: "Programa",
    duration: "Duração",
    calories: "Calorias",
    difficulty: "Dificuldade",
    preview: "Prévia dos exercícios",
    more: "mais",
    warmup: "Aquecimento",
    cooldown: "Desaquecimento",
    notes: "Observações",
    start: "Começar treino",
    viewPlan: "Ver plano completo",
    dashboard: "Ir ao painel",
    min: "min",
    kcal: "kcal",
    sets: "séries",
    rest: "descanso",
    substituted: "adaptado",
    reg: "iniciante",
    inter: "intermediário",
    adv: "avançado",
  },
  en: {
    l1: "Analyzing your assessment…",
    l2: "Selecting suitable exercises…",
    l3: "Tuning sets and rest…",
    l4: "Finalizing your workout…",
    ready: "Your first workout is ready!",
    congrats: "Congrats! We personalized everything from your assessment.",
    program: "Program",
    duration: "Duration",
    calories: "Calories",
    difficulty: "Difficulty",
    preview: "Exercises preview",
    more: "more",
    warmup: "Warm-up",
    cooldown: "Cooldown",
    notes: "Notes",
    start: "Start workout",
    viewPlan: "View full plan",
    dashboard: "Go to dashboard",
    min: "min",
    kcal: "kcal",
    sets: "sets",
    rest: "rest",
    substituted: "adapted",
    reg: "beginner",
    inter: "intermediate",
    adv: "advanced",
  },
  it: {
    l1: "Analisi della valutazione…",
    l2: "Selezione degli esercizi adatti…",
    l3: "Regolazione di serie e riposo…",
    l4: "Finalizzazione dell'allenamento…",
    ready: "Il tuo primo allenamento è pronto!",
    congrats: "Complimenti! Abbiamo personalizzato tutto in base alla tua valutazione.",
    program: "Programma",
    duration: "Durata",
    calories: "Calorie",
    difficulty: "Difficoltà",
    preview: "Anteprima esercizi",
    more: "altri",
    warmup: "Riscaldamento",
    cooldown: "Defaticamento",
    notes: "Note",
    start: "Inizia allenamento",
    viewPlan: "Vedi piano completo",
    dashboard: "Vai alla dashboard",
    min: "min",
    kcal: "kcal",
    sets: "serie",
    rest: "riposo",
    substituted: "adattato",
    reg: "principiante",
    inter: "intermedio",
    adv: "avanzato",
  },
  es: {
    l1: "Analizando tu evaluación…",
    l2: "Seleccionando ejercicios adecuados…",
    l3: "Ajustando series y descanso…",
    l4: "Finalizando tu entrenamiento…",
    ready: "¡Tu primer entrenamiento está listo!",
    congrats: "¡Felicidades! Lo personalizamos con base en tu evaluación.",
    program: "Programa",
    duration: "Duración",
    calories: "Calorías",
    difficulty: "Dificultad",
    preview: "Vista previa de ejercicios",
    more: "más",
    warmup: "Calentamiento",
    cooldown: "Enfriamiento",
    notes: "Notas",
    start: "Empezar entrenamiento",
    viewPlan: "Ver plan completo",
    dashboard: "Ir al panel",
    min: "min",
    kcal: "kcal",
    sets: "series",
    rest: "descanso",
    substituted: "adaptado",
    reg: "principiante",
    inter: "intermedio",
    adv: "avanzado",
  },
  fr: {
    l1: "Analyse de ton évaluation…",
    l2: "Sélection des exercices adaptés…",
    l3: "Réglage des séries et du repos…",
    l4: "Finalisation de ta séance…",
    ready: "Ta première séance est prête !",
    congrats: "Bravo ! Nous avons tout personnalisé selon ton évaluation.",
    program: "Programme",
    duration: "Durée",
    calories: "Calories",
    difficulty: "Difficulté",
    preview: "Aperçu des exercices",
    more: "de plus",
    warmup: "Échauffement",
    cooldown: "Retour au calme",
    notes: "Notes",
    start: "Commencer la séance",
    viewPlan: "Voir le plan complet",
    dashboard: "Aller au tableau de bord",
    min: "min",
    kcal: "kcal",
    sets: "séries",
    rest: "repos",
    substituted: "adapté",
    reg: "débutant",
    inter: "intermédiaire",
    adv: "avancé",
  },
};
function s(locale: Locale, k: string) {
  return STRINGS[locale]?.[k] ?? STRINGS.pt[k] ?? k;
}

/* --------------------------- Component --------------------------- */

function FirstWorkoutPage() {
  const { locale } = useT();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [phase, setPhase] = useState(0); // 0..3 for loading messages
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Advance phases every ~600ms
    const timers: ReturnType<typeof setTimeout>[] = [];
    [1, 2, 3].forEach((p, i) => {
      timers.push(setTimeout(() => setPhase(p), (i + 1) * 600));
    });

    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          navigate({ to: "/auth" });
          return;
        }
        const ob = await fetchOnboarding(u.user.id);
        const started = Date.now();
        const w = await WorkoutGeneratorService.generateFirstWorkout(u.user.id, {
          weightKg: ob?.weight_kg,
        });
        // Ensure loading shows for at least 2.4s for a premium feel
        const elapsed = Date.now() - started;
        const minShow = 2400;
        if (elapsed < minShow) await new Promise((r) => setTimeout(r, minShow - elapsed));
        if (cancelled) return;
        setWorkout(w);
        setLoading(false);
      } catch (e) {
        toast.error((e as Error).message);
        navigate({ to: "/" });
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh px-5 pb-32 pt-12">
      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay key="loading" phase={phase} locale={locale} />
        ) : workout ? (
          <ResultView key="result" workout={workout} locale={locale} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- Loading --------------------------- */

function LoadingOverlay({ phase, locale }: { phase: number; locale: Locale }) {
  const messages = [s(locale, "l1"), s(locale, "l2"), s(locale, "l3"), s(locale, "l4")];
  const pct = ((phase + 1) / messages.length) * 100;

  return (
    <motion.div
      key="loading-overlay"
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
        <Sparkles className="h-10 w-10" />
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
              {messages[phase]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------- Result --------------------------- */

function ResultView({ workout, locale }: { workout: GeneratedWorkout; locale: Locale }) {
  const difficultyLabel =
    workout.difficulty === "iniciante"
      ? s(locale, "reg")
      : workout.difficulty === "intermediario"
        ? s(locale, "inter")
        : s(locale, "adv");

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
        <h1 className="mt-5 text-display text-3xl leading-tight">{s(locale, "ready")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{s(locale, "congrats")}</p>
      </header>

      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {s(locale, "program")}
        </p>
        <p className="mt-1 text-xl font-bold">{workout.programTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{workout.name}</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat
            icon={<Clock className="h-4 w-4" />}
            value={`${workout.estimatedDurationMin}`}
            label={s(locale, "min")}
          />
          <Stat
            icon={<Flame className="h-4 w-4" />}
            value={`${workout.estimatedCalories}`}
            label={s(locale, "kcal")}
          />
          <Stat
            icon={<Dumbbell className="h-4 w-4" />}
            value={difficultyLabel}
            label={s(locale, "difficulty")}
            small
          />
        </div>
      </section>

      <Block title={s(locale, "warmup")}>
        <ul className="space-y-2">
          {workout.warmup.map((w, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2"
            >
              <span className="text-sm font-medium">{w.name}</span>
              {w.duration && <span className="text-xs text-muted-foreground">{w.duration}</span>}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={s(locale, "preview")}>
        <ul className="space-y-2">
          {workout.exercises.map((e, i) => (
            <li
              key={e.id + i}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  {e.substitutedFrom && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                      {s(locale, "substituted")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.sets} × {e.reps} · {s(locale, "rest")} {e.rest}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={s(locale, "cooldown")}>
        <ul className="space-y-2">
          {workout.cooldown.map((w, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2"
            >
              <span className="text-sm font-medium">{w.name}</span>
              {w.duration && <span className="text-xs text-muted-foreground">{w.duration}</span>}
            </li>
          ))}
        </ul>
      </Block>

      {workout.notes && (
        <Block title={s(locale, "notes")}>
          <p className="text-sm leading-relaxed text-muted-foreground">{workout.notes}</p>
        </Block>
      )}

      <div className="space-y-2 pt-2">
        <Link
          to="/training-plan"
          className={cn(
            "tap flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-bold text-primary-foreground shadow-glow",
          )}
        >
          <Play className="h-4 w-4" />
          Gerar plano de 4 semanas
        </Link>
        <Link
          to="/treinos/$slug"
          params={{ slug: workout.programSlug }}
          className="tap flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-4 text-sm font-semibold"
        >
          <ListChecks className="h-4 w-4" />
          {s(locale, "viewPlan")}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          to="/"
          className="tap flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-muted-foreground"
        >
          <Home className="h-4 w-4" />
          {s(locale, "dashboard")}
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
      <p className={cn("mt-2 font-bold", small ? "text-sm capitalize" : "text-xl")}>{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/* silence unused import warning when Loader2 not referenced */
void Loader2;
