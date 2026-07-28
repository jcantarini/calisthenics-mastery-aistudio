import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Check, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useT, type Locale } from "@/lib/i18n";
import { fetchOnboarding, EMPTY_ONBOARDING, type OnboardingData } from "@/lib/onboarding";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  EMPTY_ASSESSMENT,
  fetchAssessment,
  generatePlanFromAssessment,
  recommendProgram,
  scoreAssessment,
  upsertAssessment,
  type AssessmentData,
  type DipsBand,
  type MobilityBand,
  type PlankBand,
  type PullupsBand,
  type PushupsBand,
  type SkillKey,
  type SquatsBand,
  type TestKey,
} from "@/lib/assessment";
import { PROGRAMS } from "@/lib/programs";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({
    meta: [
      { title: "Avaliação Física Inicial — Barra" },
      { name: "description", content: "Descubra seu nível atual para personalizar seu plano de treino." },
    ],
  }),
  component: AssessmentPage,
});

/* ---------- i18n (compact, 5 locales) ---------- */

type Dict = Record<string, string>;
const STRINGS: Record<Locale, Dict> = {
  pt: {
    title: "Avaliação Física Inicial",
    intro: "Vamos medir seu ponto de partida em 7 testes rápidos. Pule qualquer teste se não puder executar.",
    start: "Começar avaliação",
    back: "Voltar",
    next: "Próximo",
    skip: "Não consigo agora",
    finish: "Finalizar e gerar meu plano",
    saving: "Salvando…",
    progress: "Teste {n} de {total}",
    summaryTitle: "Sua avaliação",
    summarySub: "Vamos personalizar seu plano com base nesses resultados.",
    score: "Pontuação",
    recommended: "Programa recomendado",
    planReady: "Plano personalizado pronto!",
    skipped: "Pulado",
    "t.pushups": "Força de Empurrar",
    "t.pushups.q": "Quantas flexões você faz com boa forma?",
    "t.pullups": "Força de Puxar",
    "t.pullups.q": "Quantas barras fixas você consegue?",
    "t.dips": "Paralelas",
    "t.dips.q": "Quantas paralelas (dips) você consegue?",
    "t.plank": "Core",
    "t.plank.q": "Por quanto tempo você sustenta a prancha?",
    "t.squats": "Força de Perna",
    "t.squats.q": "Quantos agachamentos sem parar?",
    "t.mobility": "Mobilidade",
    "t.mobility.q": "Como você avalia sua mobilidade?",
    "t.skills": "Habilidades atuais",
    "t.skills.q": "Selecione todas as habilidades que você já domina.",
  },
  en: {
    title: "Initial Fitness Assessment",
    intro: "Let's measure your starting point in 7 quick tests. Skip any you can't perform right now.",
    start: "Start assessment",
    back: "Back",
    next: "Next",
    skip: "Skip test",
    finish: "Finish and build my plan",
    saving: "Saving…",
    progress: "Test {n} of {total}",
    summaryTitle: "Your assessment",
    summarySub: "We'll personalize your plan based on these results.",
    score: "Score",
    recommended: "Recommended program",
    planReady: "Personalized plan ready!",
    skipped: "Skipped",
    "t.pushups": "Upper Body Strength",
    "t.pushups.q": "How many push-ups can you perform with proper form?",
    "t.pullups": "Pull Strength",
    "t.pullups.q": "How many pull-ups can you perform?",
    "t.dips": "Dips",
    "t.dips.q": "How many dips can you perform?",
    "t.plank": "Core",
    "t.plank.q": "Maximum plank hold?",
    "t.squats": "Leg Strength",
    "t.squats.q": "Maximum bodyweight squats without stopping?",
    "t.mobility": "Mobility",
    "t.mobility.q": "Rate your mobility.",
    "t.skills": "Current skills",
    "t.skills.q": "Select every skill you already have.",
  },
  it: {
    title: "Valutazione Fisica Iniziale",
    intro: "Misuriamo il tuo punto di partenza con 7 test rapidi. Salta qualsiasi test se non riesci.",
    start: "Inizia valutazione",
    back: "Indietro",
    next: "Avanti",
    skip: "Salta test",
    finish: "Termina e crea il mio piano",
    saving: "Salvataggio…",
    progress: "Test {n} di {total}",
    summaryTitle: "La tua valutazione",
    summarySub: "Personalizzeremo il tuo piano in base a questi risultati.",
    score: "Punteggio",
    recommended: "Programma consigliato",
    planReady: "Piano personalizzato pronto!",
    skipped: "Saltato",
    "t.pushups": "Forza di spinta",
    "t.pushups.q": "Quante flessioni con forma corretta?",
    "t.pullups": "Forza di tirata",
    "t.pullups.q": "Quante trazioni riesci a fare?",
    "t.dips": "Dips",
    "t.dips.q": "Quanti dips riesci a fare?",
    "t.plank": "Core",
    "t.plank.q": "Massima tenuta del plank?",
    "t.squats": "Forza gambe",
    "t.squats.q": "Massimo squat a corpo libero senza fermarsi?",
    "t.mobility": "Mobilità",
    "t.mobility.q": "Valuta la tua mobilità.",
    "t.skills": "Abilità attuali",
    "t.skills.q": "Seleziona tutte le abilità che possiedi.",
  },
  es: {
    title: "Evaluación Física Inicial",
    intro: "Vamos a medir tu punto de partida con 7 pruebas rápidas. Salta cualquiera que no puedas.",
    start: "Empezar evaluación",
    back: "Volver",
    next: "Siguiente",
    skip: "Saltar prueba",
    finish: "Finalizar y crear mi plan",
    saving: "Guardando…",
    progress: "Prueba {n} de {total}",
    summaryTitle: "Tu evaluación",
    summarySub: "Personalizaremos tu plan según estos resultados.",
    score: "Puntuación",
    recommended: "Programa recomendado",
    planReady: "¡Plan personalizado listo!",
    skipped: "Saltada",
    "t.pushups": "Fuerza de empuje",
    "t.pushups.q": "¿Cuántas flexiones haces con buena técnica?",
    "t.pullups": "Fuerza de tracción",
    "t.pullups.q": "¿Cuántas dominadas puedes hacer?",
    "t.dips": "Fondos",
    "t.dips.q": "¿Cuántos fondos puedes hacer?",
    "t.plank": "Core",
    "t.plank.q": "¿Tiempo máximo de plancha?",
    "t.squats": "Fuerza de piernas",
    "t.squats.q": "¿Máximas sentadillas sin parar?",
    "t.mobility": "Movilidad",
    "t.mobility.q": "Evalúa tu movilidad.",
    "t.skills": "Habilidades actuales",
    "t.skills.q": "Selecciona todas las habilidades que ya tienes.",
  },
  fr: {
    title: "Évaluation Physique Initiale",
    intro: "Mesurons ton point de départ en 7 tests rapides. Passe ceux que tu ne peux pas faire.",
    start: "Commencer l'évaluation",
    back: "Retour",
    next: "Suivant",
    skip: "Passer le test",
    finish: "Terminer et créer mon plan",
    saving: "Enregistrement…",
    progress: "Test {n} sur {total}",
    summaryTitle: "Ton évaluation",
    summarySub: "Nous personnaliserons ton plan selon ces résultats.",
    score: "Score",
    recommended: "Programme recommandé",
    planReady: "Plan personnalisé prêt !",
    skipped: "Passé",
    "t.pushups": "Force de poussée",
    "t.pushups.q": "Combien de pompes en bonne forme ?",
    "t.pullups": "Force de traction",
    "t.pullups.q": "Combien de tractions peux-tu faire ?",
    "t.dips": "Dips",
    "t.dips.q": "Combien de dips peux-tu faire ?",
    "t.plank": "Gainage",
    "t.plank.q": "Temps maximum de gainage ?",
    "t.squats": "Force des jambes",
    "t.squats.q": "Squats max sans t'arrêter ?",
    "t.mobility": "Mobilité",
    "t.mobility.q": "Évalue ta mobilité.",
    "t.skills": "Compétences actuelles",
    "t.skills.q": "Sélectionne toutes les compétences que tu maîtrises.",
  },
};

function s(locale: Locale, key: string, vars?: Record<string, string | number>) {
  const raw = STRINGS[locale]?.[key] ?? STRINGS.pt[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), raw);
}

/* ---------- Test option catalogs ---------- */

const PUSHUPS_OPTS: { v: PushupsBand; label: string }[] = [
  { v: "0-5", label: "0–5" },
  { v: "6-10", label: "6–10" },
  { v: "11-20", label: "11–20" },
  { v: "21-40", label: "21–40" },
  { v: "40+", label: "40+" },
];
const PULLUPS_OPTS: { v: PullupsBand; label: string }[] = [
  { v: "0", label: "0" },
  { v: "1-3", label: "1–3" },
  { v: "4-8", label: "4–8" },
  { v: "9-15", label: "9–15" },
  { v: "15+", label: "15+" },
];
const DIPS_OPTS: { v: DipsBand; label: string }[] = [
  { v: "0", label: "0" },
  { v: "1-5", label: "1–5" },
  { v: "6-10", label: "6–10" },
  { v: "11-20", label: "11–20" },
  { v: "20+", label: "20+" },
];
const PLANK_LABELS: Record<Locale, Record<PlankBand, string>> = {
  pt: { lt20: "Menos de 20s", "20-40": "20–40s", "40-60": "40–60s", "60-120": "60–120s", "120+": "120s+" },
  en: { lt20: "Less than 20s", "20-40": "20–40s", "40-60": "40–60s", "60-120": "60–120s", "120+": "120s+" },
  it: { lt20: "Meno di 20s", "20-40": "20–40s", "40-60": "40–60s", "60-120": "60–120s", "120+": "120s+" },
  es: { lt20: "Menos de 20s", "20-40": "20–40s", "40-60": "40–60s", "60-120": "60–120s", "120+": "120s+" },
  fr: { lt20: "Moins de 20s", "20-40": "20–40s", "40-60": "40–60s", "60-120": "60–120s", "120+": "120s+" },
};
const SQUATS_OPTS: { v: SquatsBand; label: string }[] = [
  { v: "0-10", label: "0–10" },
  { v: "11-20", label: "11–20" },
  { v: "21-40", label: "21–40" },
  { v: "41-60", label: "41–60" },
  { v: "60+", label: "60+" },
];
const MOBILITY_LABELS: Record<Locale, Record<MobilityBand, string>> = {
  pt: { poor: "Ruim", average: "Média", good: "Boa", excellent: "Excelente" },
  en: { poor: "Poor", average: "Average", good: "Good", excellent: "Excellent" },
  it: { poor: "Scarsa", average: "Media", good: "Buona", excellent: "Eccellente" },
  es: { poor: "Mala", average: "Media", good: "Buena", excellent: "Excelente" },
  fr: { poor: "Faible", average: "Moyenne", good: "Bonne", excellent: "Excellente" },
};
const SKILL_LABELS: Record<Locale, Record<SkillKey, string>> = {
  pt: { pullup: "Barra fixa", muscleup: "Muscle-up", handstand: "Parada de mão", frontlever: "Front lever", backlever: "Back lever", lsit: "L-Sit", planche: "Planche", humanflag: "Bandeira humana", none: "Nenhuma" },
  en: { pullup: "Pull-up", muscleup: "Muscle-up", handstand: "Handstand", frontlever: "Front Lever", backlever: "Back Lever", lsit: "L-Sit", planche: "Planche", humanflag: "Human Flag", none: "None" },
  it: { pullup: "Trazione", muscleup: "Muscle-up", handstand: "Verticale", frontlever: "Front Lever", backlever: "Back Lever", lsit: "L-Sit", planche: "Planche", humanflag: "Bandiera", none: "Nessuna" },
  es: { pullup: "Dominada", muscleup: "Muscle-up", handstand: "Vertical", frontlever: "Front Lever", backlever: "Back Lever", lsit: "L-Sit", planche: "Planche", humanflag: "Bandera", none: "Ninguna" },
  fr: { pullup: "Traction", muscleup: "Muscle-up", handstand: "ATR", frontlever: "Front Lever", backlever: "Back Lever", lsit: "L-Sit", planche: "Planche", humanflag: "Drapeau", none: "Aucune" },
};
const SKILL_ORDER: SkillKey[] = ["pullup", "muscleup", "handstand", "frontlever", "backlever", "lsit", "planche", "humanflag", "none"];

const TOTAL_TESTS = 7;

/* ---------- Page ---------- */

function AssessmentPage() {
  const { locale } = useT();
  const navigate = useNavigate();
  const [, setAppState] = useAppState();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [ob, setOb] = useState<OnboardingData>(EMPTY_ONBOARDING);
  const [data, setData] = useState<AssessmentData>(EMPTY_ASSESSMENT);
  const [step, setStep] = useState(0); // 0 = intro, 1..7 = tests, 8 = summary
  const [saving, setSaving] = useState(false);
  const bootstrapped = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      setUserId(u.user.id);
      const meta = u.user.user_metadata ?? {};
      setDisplayName((meta.full_name as string) || (meta.name as string) || u.user.email?.split("@")[0]);
      const [remoteOb, remoteAssess] = await Promise.all([
        fetchOnboarding(u.user.id),
        fetchAssessment(u.user.id),
      ]);
      if (cancelled) return;
      if (remoteOb) setOb(remoteOb);
      if (remoteAssess?.completed) {
        navigate({ to: "/" });
        return;
      }
      if (remoteAssess) setData(remoteAssess);
      bootstrapped.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Autosave draft (not completed)
  useEffect(() => {
    if (!userId || !bootstrapped.current) return;
    const id = setTimeout(() => {
      void upsertAssessment(userId, data, false).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [data, userId]);

  const goBack = () => setStep((n) => Math.max(0, n - 1));
  const goNext = () => setStep((n) => Math.min(TOTAL_TESTS + 1, n + 1));

  const testKey: TestKey | null = step >= 1 && step <= TOTAL_TESTS
    ? (["pushups", "pullups", "dips", "plank", "squats", "mobility", "skills"] as TestKey[])[step - 1]
    : null;

  const markSkipped = (k: TestKey) =>
    setData((p) => ({ ...p, skipped: Array.from(new Set([...p.skipped, k])) }));

  const clearSkip = (k: TestKey) =>
    setData((p) => ({ ...p, skipped: p.skipped.filter((x) => x !== k) }));

  const skip = () => {
    if (!testKey) return;
    markSkipped(testKey);
    goNext();
  };

  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await upsertAssessment(userId, data, true);
      setAppState((prev) => generatePlanFromAssessment(prev, ob, data, displayName));
      toast.success(s(locale, "planReady"));
      navigate({ to: "/first-workout" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const progressPct = step === 0 ? 0 : (step / (TOTAL_TESTS + 1)) * 100;

  return (
    <div className="min-h-dvh px-5 pb-32 pt-12">
      <header className="flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            aria-label={s(locale, "back")}
            className="tap grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {step === 0
              ? s(locale, "title")
              : step > TOTAL_TESTS
                ? s(locale, "summaryTitle")
                : s(locale, "progress", { n: step, total: TOTAL_TESTS })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      <section key={step} className="mt-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {step === 0 && <Intro onStart={goNext} locale={locale} />}
        {testKey === "pushups" && (
          <Choice
            title={s(locale, "t.pushups")}
            question={s(locale, "t.pushups.q")}
            options={PUSHUPS_OPTS}
            value={data.pushups}
            onSelect={(v) => { setData((p) => ({ ...p, pushups: v })); clearSkip("pushups"); }}
          />
        )}
        {testKey === "pullups" && (
          <Choice
            title={s(locale, "t.pullups")}
            question={s(locale, "t.pullups.q")}
            options={PULLUPS_OPTS}
            value={data.pullups}
            onSelect={(v) => { setData((p) => ({ ...p, pullups: v })); clearSkip("pullups"); }}
          />
        )}
        {testKey === "dips" && (
          <Choice
            title={s(locale, "t.dips")}
            question={s(locale, "t.dips.q")}
            options={DIPS_OPTS}
            value={data.dips}
            onSelect={(v) => { setData((p) => ({ ...p, dips: v })); clearSkip("dips"); }}
          />
        )}
        {testKey === "plank" && (
          <Choice
            title={s(locale, "t.plank")}
            question={s(locale, "t.plank.q")}
            options={(Object.keys(PLANK_LABELS[locale]) as PlankBand[]).map((k) => ({ v: k, label: PLANK_LABELS[locale][k] }))}
            value={data.plank}
            onSelect={(v) => { setData((p) => ({ ...p, plank: v })); clearSkip("plank"); }}
          />
        )}
        {testKey === "squats" && (
          <Choice
            title={s(locale, "t.squats")}
            question={s(locale, "t.squats.q")}
            options={SQUATS_OPTS}
            value={data.squats}
            onSelect={(v) => { setData((p) => ({ ...p, squats: v })); clearSkip("squats"); }}
          />
        )}
        {testKey === "mobility" && (
          <Choice
            title={s(locale, "t.mobility")}
            question={s(locale, "t.mobility.q")}
            options={(Object.keys(MOBILITY_LABELS[locale]) as MobilityBand[]).map((k) => ({ v: k, label: MOBILITY_LABELS[locale][k] }))}
            value={data.mobility}
            onSelect={(v) => { setData((p) => ({ ...p, mobility: v })); clearSkip("mobility"); }}
          />
        )}
        {testKey === "skills" && (
          <SkillsPicker
            title={s(locale, "t.skills")}
            question={s(locale, "t.skills.q")}
            value={data.skills}
            labels={SKILL_LABELS[locale]}
            onToggle={(k) => {
              clearSkip("skills");
              setData((p) => {
                const has = p.skills.includes(k);
                if (k === "none") return { ...p, skills: has ? [] : ["none"] };
                const next = has ? p.skills.filter((x) => x !== k) : [...p.skills.filter((x) => x !== "none"), k];
                return { ...p, skills: next };
              });
            }}
          />
        )}
        {step === TOTAL_TESTS + 1 && (
          <Summary data={data} ob={ob} locale={locale} />
        )}
      </section>

      {step > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-5 pt-4 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="tap flex-1 rounded-full border border-border px-4 py-3 text-sm font-semibold"
            >
              {s(locale, "back")}
            </button>
            {step <= TOTAL_TESTS && (
              <button
                type="button"
                onClick={skip}
                className="tap rounded-full border border-border px-4 py-3 text-xs font-semibold text-muted-foreground"
              >
                {s(locale, "skip")}
              </button>
            )}
            {step <= TOTAL_TESTS ? (
              <button
                type="button"
                onClick={goNext}
                className="tap flex-[2] rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow"
              >
                {s(locale, "next")}
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="tap flex-[2] rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {s(locale, "saving")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {s(locale, "finish")}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function Intro({ onStart, locale }: { onStart: () => void; locale: Locale }) {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center text-center">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
        <Trophy className="h-10 w-10" />
      </div>
      <h1 className="text-display text-4xl leading-tight">{s(locale, "title")}</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">{s(locale, "intro")}</p>
      <button
        type="button"
        onClick={onStart}
        className="tap mx-auto mt-10 w-full max-w-xs rounded-full bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-glow"
      >
        {s(locale, "start")}
      </button>
    </div>
  );
}

function Choice<T extends string>({
  title, question, options, value, onSelect,
}: {
  title: string;
  question: string;
  options: { v: T; label: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-display text-3xl leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{question}</p>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(o.v)}
              className={cn(
                "tap flex w-full items-center gap-3 rounded-2xl border-2 bg-surface p-4 text-left transition-all",
                active ? "border-primary bg-primary/10 shadow-glow" : "border-border/60 hover:border-border",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="text-sm font-semibold">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkillsPicker({
  title, question, value, labels, onToggle,
}: {
  title: string;
  question: string;
  value: SkillKey[];
  labels: Record<SkillKey, string>;
  onToggle: (k: SkillKey) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-display text-3xl leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{question}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SKILL_ORDER.map((k) => {
          const active = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(k)}
              className={cn(
                "tap flex items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-left transition-all",
                active ? "border-primary bg-primary/10 shadow-glow" : "border-border/60",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border-2",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="text-sm font-semibold">{labels[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Summary({ data, ob, locale }: { data: AssessmentData; ob: OnboardingData; locale: Locale }) {
  const score = useMemo(() => scoreAssessment(data), [data]);
  const slug = useMemo(() => recommendProgram(ob, data), [ob, data]);
  const program = PROGRAMS.find((p) => p.slug === slug) ?? PROGRAMS[0];

  const rows: { label: string; value: string }[] = [
    { label: s(locale, "t.pushups"), value: data.pushups ?? s(locale, "skipped") },
    { label: s(locale, "t.pullups"), value: data.pullups ?? s(locale, "skipped") },
    { label: s(locale, "t.dips"), value: data.dips ?? s(locale, "skipped") },
    { label: s(locale, "t.plank"), value: data.plank ? PLANK_LABELS[locale][data.plank] : s(locale, "skipped") },
    { label: s(locale, "t.squats"), value: data.squats ?? s(locale, "skipped") },
    { label: s(locale, "t.mobility"), value: data.mobility ? MOBILITY_LABELS[locale][data.mobility] : s(locale, "skipped") },
    {
      label: s(locale, "t.skills"),
      value: data.skills.length
        ? data.skills.map((k) => SKILL_LABELS[locale][k]).join(", ")
        : s(locale, "skipped"),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-display text-3xl leading-tight">{s(locale, "summaryTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{s(locale, "summarySub")}</p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {s(locale, "score")}
        </p>
        <p className="mt-1 text-4xl font-bold">
          {score}
          <span className="ml-1 text-base font-medium text-muted-foreground">/ 27</span>
        </p>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {s(locale, "recommended")}
        </p>
        <p className="mt-1 text-lg font-bold">{program.title}</p>
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-surface">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{r.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{r.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
