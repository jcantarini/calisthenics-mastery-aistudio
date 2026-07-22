import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useT, LOCALES, type Locale } from "@/lib/i18n";
import { tOb } from "@/lib/onboarding-i18n";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  EMPTY_ONBOARDING,
  TOTAL_STEPS,
  clearDraft,
  fetchOnboarding,
  generatePlan,
  loadDraft,
  saveDraft,
  upsertOnboarding,
  type FitnessLevel,
  type Gender,
  type Motivation,
  type OnboardingData,
  type PrimaryGoal,
  type SkillGoal,
} from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Barra" },
      { name: "description", content: "Personalize seu plano de calistenia em poucos passos." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t, locale } = useT();
  const navigate = useNavigate();
  const [, setAppState] = useAppState();
  const [data, setData] = useState<OnboardingData>(() => loadDraft());
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  // Bootstrap: load user + remote onboarding
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      setUserId(u.user.id);
      const meta = u.user.user_metadata ?? {};
      setDisplayName((meta.full_name as string) || (meta.name as string) || u.user.email?.split("@")[0]);
      const remote = await fetchOnboarding(u.user.id);
      if (cancelled) return;
      if (remote?.onboarding_completed) {
        navigate({ to: "/" });
        return;
      }
      if (remote) {
        setData((prev) => ({ ...remote, ...prev, equipment: prev.equipment.length ? prev.equipment : remote.equipment, target_areas: prev.target_areas.length ? prev.target_areas : remote.target_areas }));
      }
      // Default language from current locale if empty
      setData((prev) => ({ ...prev, language: prev.language ?? locale }));
      bootstrapped.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to localStorage + Supabase (debounced)
  useEffect(() => {
    saveDraft(data);
    if (!userId || !bootstrapped.current) return;
    const id = setTimeout(() => {
      void upsertOnboarding(userId, data, false).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [data, userId]);

  const set = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const toggleInArray = (k: "equipment" | "target_areas", value: string) =>
    setData((prev) => {
      const list = prev[k] ?? [];
      return { ...prev, [k]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });

  const validate = (s: number): string | null => {
    switch (s) {
      case 2:
        if (!data.age || data.age < 10 || data.age > 100) return tOb(locale, "ob.err.age");
        if (!data.gender) return tOb(locale, "ob.err.pickOne");
        if (!data.height_cm || data.height_cm < 100 || data.height_cm > 250) return tOb(locale, "ob.err.height");
        if (!data.weight_kg || data.weight_kg < 30 || data.weight_kg > 300) return tOb(locale, "ob.err.weight");
        if (!data.country?.trim()) return tOb(locale, "ob.err.required");
        if (!data.language) return tOb(locale, "ob.err.pickOne");
        return null;
      case 3:
        return data.fitness_level ? null : tOb(locale, "ob.err.pickOne");
      case 4:
        return data.primary_goal ? null : tOb(locale, "ob.err.pickOne");
      case 5:
        return typeof data.has_experience === "boolean" ? null : tOb(locale, "ob.err.pickOne");
      case 6:
        return (data.equipment?.length ?? 0) > 0 ? null : tOb(locale, "ob.err.pickMany");
      case 7:
        if (!data.days_per_week) return tOb(locale, "ob.err.pickOne");
        if (!data.workout_duration_min) return tOb(locale, "ob.err.pickOne");
        return null;
      case 8:
        return (data.target_areas?.length ?? 0) > 0 ? null : tOb(locale, "ob.err.pickMany");
      case 10:
        return data.motivation ? null : tOb(locale, "ob.err.pickOne");
      case 11:
        return data.skill_goal ? null : tOb(locale, "ob.err.pickOne");
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validate(step);
    if (err) {
      setError(err);
      toast.error(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await upsertOnboarding(userId, data, true);
      setAppState((prev) => generatePlan(prev, data, displayName));
      clearDraft();
      toast.success(tOb(locale, "ob.planReady"));
      navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen px-5 pb-32 pt-12">
      <Toaster position="top-center" richColors />
      {/* Header */}
      <header className="flex items-center gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            aria-label={tOb(locale, "ob.back")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {tOb(locale, "ob.progress", { n: step, total: TOTAL_STEPS })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Step body */}
      <section key={step} className="mt-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {step === 1 && <Step1 onStart={goNext} />}
        {step === 2 && <Step2 data={data} set={set} />}
        {step === 3 && <Step3 data={data} set={set} />}
        {step === 4 && <Step4 data={data} set={set} />}
        {step === 5 && <Step5 data={data} set={set} />}
        {step === 6 && <Step6 data={data} toggle={(v) => toggleInArray("equipment", v)} />}
        {step === 7 && <Step7 data={data} set={set} />}
        {step === 8 && <Step8 data={data} toggle={(v) => toggleInArray("target_areas", v)} />}
        {step === 9 && <Step9 data={data} set={set} />}
        {step === 10 && <Step10 data={data} set={set} />}
        {step === 11 && <Step11 data={data} set={set} />}
        {step === 12 && <Step12 data={data} setPerf={(k, v) => setData((p) => ({ ...p, current_performance: { ...p.current_performance, [k]: v } }))} />}
        {step === 13 && <Step13 data={data} onEdit={(s) => setStep(s)} />}
      </section>

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Sticky footer nav */}
      {step > 1 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-5 pt-4 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-full border border-border px-5 py-3 text-sm font-semibold"
            >
              {tOb(locale, "ob.back")}
            </button>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-[2] rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow"
              >
                {tOb(locale, "ob.next")}
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="flex-[2] rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tOb(locale, "ob.saving")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {tOb(locale, "ob.finish")}
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

/* -------- Reusable UI atoms -------- */

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-display text-3xl leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  label,
  description,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-2 bg-surface text-left transition-all",
        compact ? "px-4 py-3" : "p-4",
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
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full bg-transparent text-base font-medium outline-none"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-base font-medium outline-none focus:border-primary"
      />
    </label>
  );
}

/* -------- Steps -------- */

function Step1({ onStart }: { onStart: () => void }) {
  const { locale } = useT();
  return (
    <div className="flex min-h-[70vh] flex-col justify-center text-center">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
        <Sparkles className="h-10 w-10" />
      </div>
      <h1 className="text-display text-4xl leading-tight">{tOb(locale, "ob.s1.title")}</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">{tOb(locale, "ob.s1.body")}</p>
      <button
        type="button"
        onClick={onStart}
        className="mx-auto mt-10 w-full max-w-xs rounded-full bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-glow"
      >
        {tOb(locale, "ob.s1.cta")}
      </button>
    </div>
  );
}

function Step2({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s2.title")} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={tOb(locale, "ob.s2.age")} value={data.age} onChange={(v) => set("age", v)} min={10} max={100} />
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tOb(locale, "ob.s2.gender")}</span>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-surface p-1">
            {(["male", "female", "other"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("gender", g)}
                className={cn(
                  "rounded-lg py-2 text-xs font-semibold transition-colors",
                  data.gender === g ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {tOb(locale, `ob.s2.g.${g}`)}
              </button>
            ))}
          </div>
        </div>
        <NumberField label={tOb(locale, "ob.s2.height")} value={data.height_cm} onChange={(v) => set("height_cm", v)} min={100} max={250} suffix="cm" />
        <NumberField label={tOb(locale, "ob.s2.weight")} value={data.weight_kg} onChange={(v) => set("weight_kg", v)} min={30} max={300} suffix="kg" />
      </div>
      <TextField label={tOb(locale, "ob.s2.country")} value={data.country} onChange={(v) => set("country", v)} placeholder="Brasil" />
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tOb(locale, "ob.s2.language")}</span>
        <div className="mt-1 grid grid-cols-5 gap-1 rounded-xl border border-border/60 bg-surface p-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => set("language", l.code)}
              className={cn(
                "rounded-lg py-2 text-sm transition-colors",
                data.language === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
              aria-label={l.label}
            >
              {l.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  const opts: FitnessLevel[] = ["beginner", "intermediate", "advanced"];
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s3.title")} />
      <div className="space-y-2">
        {opts.map((o) => (
          <OptionCard
            key={o}
            active={data.fitness_level === o}
            onClick={() => set("fitness_level", o)}
            label={tOb(locale, `ob.s3.${o}`)}
            description={tOb(locale, `ob.s3.${o}.d`)}
          />
        ))}
      </div>
    </div>
  );
}

function Step4({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  const opts: PrimaryGoal[] = ["muscle", "fat", "strength", "endurance", "skills", "fitness"];
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s4.title")} />
      <div className="space-y-2">
        {opts.map((o) => (
          <OptionCard
            key={o}
            active={data.primary_goal === o}
            onClick={() => set("primary_goal", o)}
            label={tOb(locale, `ob.s4.${o}`)}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function Step5({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s5.title")} />
      <div className="grid grid-cols-2 gap-3">
        <OptionCard active={data.has_experience === true} onClick={() => set("has_experience", true)} label={tOb(locale, "ob.s5.yes")} />
        <OptionCard active={data.has_experience === false} onClick={() => set("has_experience", false)} label={tOb(locale, "ob.s5.no")} />
      </div>
    </div>
  );
}

const EQUIPMENT_OPTS = ["pullbar", "parallels", "rings", "bands", "dumbbells", "gym", "home", "none"];
function Step6({ data, toggle }: { data: OnboardingData; toggle: (v: string) => void }) {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s6.title")} subtitle={tOb(locale, "ob.s6.hint")} />
      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_OPTS.map((o) => (
          <OptionCard key={o} active={data.equipment.includes(o)} onClick={() => toggle(o)} label={tOb(locale, `ob.s6.${o}`)} compact />
        ))}
      </div>
    </div>
  );
}

function Step7({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  const durations = [15, 30, 45, 60, 90];
  return (
    <div className="space-y-6">
      <StepTitle title={tOb(locale, "ob.s7.title")} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tOb(locale, "ob.s7.days")}</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set("days_per_week", n)}
              className={cn(
                "rounded-xl border-2 py-3 text-sm font-bold transition-all",
                data.days_per_week === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-surface",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tOb(locale, "ob.s7.duration")}</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {durations.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set("workout_duration_min", d)}
              className={cn(
                "rounded-xl border-2 py-3 text-xs font-bold transition-all",
                data.workout_duration_min === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-surface",
              )}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const AREA_OPTS = ["chest", "back", "shoulders", "arms", "legs", "core", "full"];
function Step8({ data, toggle }: { data: OnboardingData; toggle: (v: string) => void }) {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s8.title")} subtitle={tOb(locale, "ob.s8.hint")} />
      <div className="grid grid-cols-2 gap-2">
        {AREA_OPTS.map((o) => (
          <OptionCard key={o} active={data.target_areas.includes(o)} onClick={() => toggle(o)} label={tOb(locale, `ob.s8.${o}`)} compact />
        ))}
      </div>
    </div>
  );
}

function Step9({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s9.title")} subtitle={tOb(locale, "ob.s9.hint")} />
      <textarea
        value={data.injuries ?? ""}
        onChange={(e) => set("injuries", e.target.value)}
        placeholder={tOb(locale, "ob.s9.placeholder")}
        rows={5}
        className="w-full resize-none rounded-2xl border border-border/60 bg-surface p-4 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function Step10({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  const opts: Motivation[] = ["healthy", "stronger", "muscle", "lose", "skills", "appearance"];
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s10.title")} />
      <div className="space-y-2">
        {opts.map((o) => (
          <OptionCard key={o} active={data.motivation === o} onClick={() => set("motivation", o)} label={tOb(locale, `ob.s10.${o}`)} compact />
        ))}
      </div>
    </div>
  );
}

function Step11({ data, set }: { data: OnboardingData; set: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void }) {
  const { locale } = useT();
  const opts: SkillGoal[] = ["pullup", "muscleup", "handstand", "frontlever", "backlever", "planche", "humanflag", "pistol", "lsit", "none"];
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s11.title")} />
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <OptionCard key={o} active={data.skill_goal === o} onClick={() => set("skill_goal", o)} label={tOb(locale, `ob.s11.${o}`)} compact />
        ))}
      </div>
    </div>
  );
}

function Step12({ data, setPerf }: { data: OnboardingData; setPerf: (k: keyof OnboardingData["current_performance"], v: number | undefined) => void }) {
  const { locale } = useT();
  const items: { key: keyof OnboardingData["current_performance"]; label: string }[] = [
    { key: "pushups", label: tOb(locale, "ob.s12.pushups") },
    { key: "pullups", label: tOb(locale, "ob.s12.pullups") },
    { key: "dips", label: tOb(locale, "ob.s12.dips") },
    { key: "squats", label: tOb(locale, "ob.s12.squats") },
    { key: "plank", label: tOb(locale, "ob.s12.plank") },
  ];
  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s12.title")} />
      <div className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <NumberField
            key={i.key}
            label={i.label}
            value={data.current_performance[i.key]}
            onChange={(v) => setPerf(i.key, v)}
            min={0}
            max={9999}
          />
        ))}
      </div>
    </div>
  );
}

function Step13({ data, onEdit }: { data: OnboardingData; onEdit: (s: number) => void }) {
  const { locale } = useT();
  const rows = useMemo(() => {
    const eq = data.equipment.map((e) => tOb(locale, `ob.s6.${e}`)).join(", ");
    const areas = data.target_areas.map((a) => tOb(locale, `ob.s8.${a}`)).join(", ");
    const perf = Object.entries(data.current_performance)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${tOb(locale, `ob.s12.${k}`)}: ${v}`)
      .join(" · ") || tOb(locale, "ob.none");
    return [
      { step: 2, label: tOb(locale, "ob.field.age"), value: data.age ? `${data.age}` : "—" },
      { step: 2, label: tOb(locale, "ob.field.gender"), value: data.gender ? tOb(locale, `ob.s2.g.${data.gender}`) : "—" },
      { step: 2, label: tOb(locale, "ob.field.height"), value: data.height_cm ? `${data.height_cm} cm` : "—" },
      { step: 2, label: tOb(locale, "ob.field.weight"), value: data.weight_kg ? `${data.weight_kg} kg` : "—" },
      { step: 2, label: tOb(locale, "ob.field.country"), value: data.country ?? "—" },
      { step: 2, label: tOb(locale, "ob.field.language"), value: (LOCALES.find((l) => l.code === (data.language as Locale))?.label) ?? data.language ?? "—" },
      { step: 3, label: tOb(locale, "ob.field.level"), value: data.fitness_level ? tOb(locale, `ob.s3.${data.fitness_level}`) : "—" },
      { step: 4, label: tOb(locale, "ob.field.goal"), value: data.primary_goal ? tOb(locale, `ob.s4.${data.primary_goal}`) : "—" },
      { step: 5, label: tOb(locale, "ob.field.experience"), value: data.has_experience == null ? "—" : tOb(locale, data.has_experience ? "ob.s5.yes" : "ob.s5.no") },
      { step: 6, label: tOb(locale, "ob.field.equipment"), value: eq || tOb(locale, "ob.none") },
      { step: 7, label: tOb(locale, "ob.field.schedule"), value: data.days_per_week ? `${data.days_per_week} × / ${tOb(locale, "ob.s7.days").toLowerCase()}` : "—" },
      { step: 7, label: tOb(locale, "ob.field.duration"), value: data.workout_duration_min ? `${data.workout_duration_min} min` : "—" },
      { step: 8, label: tOb(locale, "ob.field.areas"), value: areas || tOb(locale, "ob.none") },
      { step: 9, label: tOb(locale, "ob.field.injuries"), value: data.injuries?.trim() || tOb(locale, "ob.none") },
      { step: 10, label: tOb(locale, "ob.field.motivation"), value: data.motivation ? tOb(locale, `ob.s10.${data.motivation}`) : "—" },
      { step: 11, label: tOb(locale, "ob.field.skill"), value: data.skill_goal ? tOb(locale, `ob.s11.${data.skill_goal}`) : "—" },
      { step: 12, label: tOb(locale, "ob.field.perf"), value: perf },
    ];
  }, [data, locale]);

  return (
    <div className="space-y-5">
      <StepTitle title={tOb(locale, "ob.s13.title")} subtitle={tOb(locale, "ob.s13.body")} />
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-surface">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{r.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{r.value}</p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(r.step)}
              className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              {tOb(locale, "ob.edit")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
