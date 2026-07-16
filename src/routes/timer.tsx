import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  Vibrate,
  Timer as TimerIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { estimateKcal, logWorkoutSession, useAppState } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Timer de intervalos — Barra" },
      {
        name: "description",
        content:
          "Temporizador de HIIT e calistenia militar com fases de preparação, execução, descanso, chamadas em tela, bipes e vibração.",
      },
    ],
  }),
  component: TimerPage,
});

type Phase = "prep" | "work" | "rest" | "done";

const PRESETS = [
  { key: "tabata", work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, prep: 10 },
  { key: "hiit", work: 40, rest: 20, rounds: 6, sets: 3, setRest: 60, prep: 10 },
  { key: "militar", work: 45, rest: 15, rounds: 10, sets: 1, setRest: 0, prep: 10 },
  { key: "custom", work: 30, rest: 15, rounds: 8, sets: 2, setRest: 45, prep: 10 },
] as const;

const CONFIG_KEY = "barra:timer:v1";

interface Config {
  prep: number;
  work: number;
  rest: number;
  rounds: number;
  sets: number;
  setRest: number;
  sound: boolean;
  vibrate: boolean;
}

const DEFAULT_CONFIG: Config = {
  prep: 10,
  work: 40,
  rest: 20,
  rounds: 6,
  sets: 3,
  setRest: 60,
  sound: true,
  vibrate: true,
};

function TimerPage() {
  const [state, setState] = useAppState();
  const { t } = useT();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [presetKey, setPresetKey] = useState<(typeof PRESETS)[number]["key"]>("hiit");
  const [lastLogged, setLastLogged] = useState<{ kcal: number; durationSec: number } | null>(null);

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("prep");
  const [remaining, setRemaining] = useState(DEFAULT_CONFIG.prep);
  const [round, setRound] = useState(1);
  const [set, setSet] = useState(1);
  const [isSetRest, setIsSetRest] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hydrate config
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        setConfig(merged);
        setRemaining(merged.prep);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {}
  }, [config, hydrated]);

  // Sound helper
  const beep = (freq: number, duration = 0.15, type: OscillatorType = "sine") => {
    if (!config.sound) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const vibrate = (pattern: number | number[]) => {
    if (!config.vibrate) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {}
  };

  // Tick loop
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Phase transitions
  useEffect(() => {
    if (!running) return;
    // Countdown cue: 3-2-1 beeps
    if (remaining === 3 || remaining === 2 || remaining === 1) {
      beep(700, 0.12, "square");
      vibrate(60);
    }
    if (remaining > 0) return;

    // Transition
    if (phase === "prep") {
      startPhase("work");
      return;
    }
    if (phase === "work") {
      if (round < config.rounds) {
        startPhase("rest");
        setRound((r) => r + 1);
      } else if (set < config.sets) {
        if (config.setRest > 0) {
          setIsSetRest(true);
          startPhase("rest", config.setRest);
        } else {
          setIsSetRest(false);
          setSet((s) => s + 1);
          setRound(1);
          startPhase("work");
        }
      } else {
        setPhase("done");
        setRunning(false);
        beep(880, 0.4, "triangle");
        setTimeout(() => beep(1200, 0.5, "triangle"), 220);
        vibrate([200, 100, 200, 100, 400]);
        // Auto-log workout session
        const met = presetKey === "tabata" ? 10 : presetKey === "militar" ? 9 : presetKey === "hiit" ? 8.5 : 7;
        const durationSec =
          config.prep +
          config.sets * (config.work * config.rounds + config.rest * Math.max(0, config.rounds - 1)) +
          Math.max(0, config.sets - 1) * config.setRest;
        const kcal = estimateKcal(met, stateRef.current.profile.weightKg, durationSec);
        const label = t(`timer.preset.${presetKey}`);
        setState((s) =>
          logWorkoutSession(s, {
            source: "timer",
            label: `Timer · ${label}`,
            durationSec,
            kcalBurned: kcal,
          }),
        );
        setLastLogged({ kcal, durationSec });
      }
      return;
    }
    if (phase === "rest") {
      if (isSetRest) {
        setIsSetRest(false);
        setSet((s) => s + 1);
        setRound(1);
      }
      startPhase("work");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const startPhase = (p: Phase, overrideSeconds?: number) => {
    setPhase(p);
    const seconds =
      overrideSeconds ??
      (p === "prep" ? config.prep : p === "work" ? config.work : config.rest);
    setRemaining(seconds);
    // Announce
    if (p === "work") {
      beep(1000, 0.25, "sawtooth");
      vibrate([120, 60, 120]);
    } else if (p === "rest") {
      beep(400, 0.25, "sine");
      vibrate(150);
    }
  };

  const start = () => {
    // resume audio ctx on user gesture
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      audioCtxRef.current?.resume?.();
    } catch {}
    if (phase === "done") reset(true);
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = (autostart = false) => {
    setRunning(false);
    setPhase("prep");
    setRound(1);
    setSet(1);
    setIsSetRest(false);
    setRemaining(config.prep);
    if (autostart) setTimeout(() => setRunning(true), 0);
  };

  const skip = () => {
    setRemaining(0);
  };

  const applyPreset = (key: (typeof PRESETS)[number]["key"]) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPresetKey(key);
    const next = {
      ...config,
      prep: p.prep,
      work: p.work,
      rest: p.rest,
      rounds: p.rounds,
      sets: p.sets,
      setRest: p.setRest,
    };
    setConfig(next);
    setRunning(false);
    setPhase("prep");
    setRound(1);
    setSet(1);
    setIsSetRest(false);
    setRemaining(p.prep);
  };

  const totalSeconds = useMemo(() => {
    const perSet =
      config.work * config.rounds + config.rest * Math.max(0, config.rounds - 1);
    const setRests = Math.max(0, config.sets - 1) * config.setRest;
    return config.prep + config.sets * perSet + setRests;
  }, [config]);

  const label =
    phase === "prep"
      ? t("timer.phase.prep")
      : phase === "work"
        ? isSetRest
          ? t("timer.phase.rest")
          : t("timer.phase.work")
        : isSetRest
          ? t("timer.phase.setRest")
          : phase === "rest"
            ? t("timer.phase.rest")
            : t("timer.phase.done");

  const phaseColor =
    phase === "work"
      ? "var(--lime)"
      : phase === "rest"
        ? "oklch(0.72 0.14 220)"
        : phase === "done"
          ? "var(--ember)"
          : "oklch(0.75 0.12 90)";

  const totalPhase =
    phase === "prep"
      ? config.prep
      : phase === "work"
        ? config.work
        : isSetRest
          ? config.setRest
          : config.rest;
  const progress = totalPhase > 0 ? 1 - remaining / totalPhase : 0;

  return (
    <div className="pt-12">
      <div className="px-5">
        <div className="flex items-center justify-between">
          <Link
            to="/treinos"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/60 backdrop-blur"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfig((c) => ({ ...c, sound: !c.sound }))}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border transition-colors",
                config.sound
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground",
              )}
              aria-label={t("timer.toggleSound")}
            >
              {config.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setConfig((c) => ({ ...c, vibrate: !c.vibrate }))}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border transition-colors",
                config.vibrate
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground",
              )}
              aria-label={t("timer.toggleVibrate")}
            >
              <Vibrate className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("timer.eyebrow")}
          </p>
          <h1 className="mt-1 text-display text-4xl">
            {t("timer.titlePart")} <span className="text-primary">{t("timer.titleHl")}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("timer.intro")}</p>
        </div>

        {/* Presets */}
        <div className="mt-6 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="shrink-0 rounded-full border border-border/60 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors active:scale-[0.98]"
              >
                {t(`timer.preset.${p.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Big timer */}
      <div className="mt-6 px-5">
        <div
          className="relative overflow-hidden rounded-[36px] border p-6 transition-colors"
          style={{
            borderColor: `color-mix(in oklab, ${phaseColor} 55%, transparent)`,
            background: `linear-gradient(180deg, color-mix(in oklab, ${phaseColor} 22%, transparent), transparent)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest"
              style={{ borderColor: phaseColor, color: phaseColor }}
            >
              {label}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {t("timer.set")} {set}/{config.sets} · {t("timer.round")} {round}/{config.rounds}
            </span>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div
              className="text-display leading-none"
              style={{ fontSize: "min(38vw, 180px)", color: phaseColor }}
            >
              {String(Math.max(0, remaining)).padStart(2, "0")}
            </div>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {phase === "done" ? "treino finalizado" : "segundos restantes"}
            </p>
            {phase === "done" && lastLogged && (
              <div className="mt-4 w-full rounded-2xl border border-primary/40 bg-primary/10 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Sessão registrada no diário
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {Math.round(lastLogged.durationSec / 60)} min · {lastLogged.kcal} kcal queimadas
                </p>
                <Link
                  to="/relatorio"
                  className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-widest text-primary"
                >
                  Ver relatório →
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-background/50">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                background: phaseColor,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              onClick={() => reset()}
              className="grid h-14 place-items-center rounded-2xl border border-border/60 bg-background/40 text-muted-foreground active:scale-[0.98]"
              aria-label="Reiniciar"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={running ? pause : start}
              className="grid h-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow active:scale-[0.98]"
              aria-label={running ? "Pausar" : "Iniciar"}
            >
              {running ? (
                <Pause className="h-6 w-6 fill-current" strokeWidth={0} />
              ) : (
                <Play className="h-6 w-6 fill-current" strokeWidth={0} />
              )}
            </button>
            <button
              onClick={skip}
              className="grid h-14 place-items-center rounded-2xl border border-border/60 bg-background/40 text-muted-foreground active:scale-[0.98]"
              aria-label="Pular fase"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="mt-8 px-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TimerIcon className="h-4 w-4" />
          <p className="text-[11px] font-semibold uppercase tracking-widest">Configuração</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stepper
            label="Preparação"
            value={config.prep}
            suffix="s"
            step={5}
            min={0}
            onChange={(v) => {
              setConfig((c) => ({ ...c, prep: v }));
              if (!running && phase === "prep") setRemaining(v);
            }}
          />
          <Stepper
            label="Execução"
            value={config.work}
            suffix="s"
            step={5}
            min={5}
            onChange={(v) => setConfig((c) => ({ ...c, work: v }))}
          />
          <Stepper
            label="Descanso"
            value={config.rest}
            suffix="s"
            step={5}
            min={0}
            onChange={(v) => setConfig((c) => ({ ...c, rest: v }))}
          />
          <Stepper
            label="Rounds"
            value={config.rounds}
            step={1}
            min={1}
            onChange={(v) => setConfig((c) => ({ ...c, rounds: v }))}
          />
          <Stepper
            label="Séries"
            value={config.sets}
            step={1}
            min={1}
            onChange={(v) => setConfig((c) => ({ ...c, sets: v }))}
          />
          <Stepper
            label="Desc. série"
            value={config.setRest}
            suffix="s"
            step={15}
            min={0}
            onChange={(v) => setConfig((c) => ({ ...c, setRest: v }))}
          />
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          Tempo total estimado ·{" "}
          <span className="text-foreground">
            {Math.floor(totalSeconds / 60)}min {totalSeconds % 60}s
          </span>
        </p>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step = 5,
  min = 0,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="grid h-8 w-8 place-items-center rounded-full border border-border/60 text-muted-foreground active:scale-95"
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-display text-2xl">
          {value}
          {suffix && <span className="ml-0.5 text-sm text-muted-foreground">{suffix}</span>}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="grid h-8 w-8 place-items-center rounded-full border border-border/60 text-muted-foreground active:scale-95"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
