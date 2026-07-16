import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Play, Check, Info, Timer, Target } from "lucide-react";
import { getProgram, LEVEL_META, type Program } from "@/lib/programs";
import { useAppState } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/treinos/$slug")({
  head: ({ params }) => {
    const p = getProgram(params.slug);
    return {
      meta: [
        { title: p ? `${p.title} — Barra` : "Programa — Barra" },
        {
          name: "description",
          content: p ? p.tagline : "Programa de calistenia com vídeos e progressões.",
        },
      ],
    };
  },
  loader: ({ params }): { program: Program } => {
    const program = getProgram(params.slug);
    if (!program) throw notFound();
    return { program };
  },
  component: ProgramPage,
});

function ProgramPage() {
  const { program } = Route.useLoaderData() as { program: Program };
  const [state, setState] = useAppState();
  const { t } = useT();
  const [playing, setPlaying] = useState<string | null>(null);

  const doneCount = program.exercises.filter((e) => state.completedExercises[e.id]).length;
  const pct = (doneCount / program.exercises.length) * 100;
  const isActive = state.activeProgram === program.slug;

  const toggle = (id: string) =>
    setState((s) => ({
      ...s,
      completedExercises: { ...s.completedExercises, [id]: !s.completedExercises[id] },
    }));

  const activate = () =>
    setState((s) => ({
      ...s,
      activeProgram: program.slug,
      streak: s.streak,
      completedSessions: [new Date().toISOString(), ...s.completedSessions].slice(0, 60),
      lastSession: new Date().toISOString(),
    }));

  return (
    <div className="pt-12">
      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pb-8"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${program.color} 22%, transparent), transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/treinos"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/60 backdrop-blur"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span
            className="rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest"
            style={{ borderColor: program.color, color: program.color }}
          >
            {LEVEL_META[program.level].badge} · {LEVEL_META[program.level].label}
          </span>
        </div>

        <h1 className="mt-6 text-display text-5xl leading-none">{program.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{program.tagline}</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label={t("program.weeksLabel")} value={String(program.weeks)} />
          <Stat label={t("program.duration")} value={program.duration} />
          <Stat label={t("program.daysPerWeek")} value={String(program.daysPerWeek)} />
        </div>

        <div className="mt-5 rounded-2xl border border-border/60 bg-surface-elevated/70 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-widest">{t("program.goal")}</p>
          </div>
          <p className="mt-1.5 text-sm font-medium">{program.goal}</p>
        </div>
      </div>

      {/* Progress + Start */}
      <div className="px-5">
        <div className="rounded-2xl border border-border/60 bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("program.sessionProgress")}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {doneCount}/{program.exercises.length}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            onClick={activate}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98]",
              isActive
                ? "border border-primary/40 bg-primary/10 text-primary"
                : "bg-primary text-primary-foreground shadow-glow",
            )}
          >
            {isActive ? t("program.register") : t("program.activate")}
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="px-5 pt-8">
        <h2 className="text-display text-2xl">{t("program.exercises")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("program.exercisesDesc")}</p>

        <ol className="mt-4 space-y-3">
          {program.exercises.map((ex, i) => {
            const done = !!state.completedExercises[ex.id];
            const isPlaying = playing === ex.id;
            return (
              <li
                key={ex.id}
                className={cn(
                  "overflow-hidden rounded-3xl border transition-colors",
                  done ? "border-primary/40 bg-primary/5" : "border-border/60 bg-surface",
                )}
              >
                <div className="flex gap-3 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/40 font-mono text-xs font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-bold">{ex.name}</h3>
                      <button
                        onClick={() => toggle(ex.id)}
                        aria-label={done ? t("program.uncheck") : t("program.markDone")}
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60",
                        )}
                      >
                        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{ex.focus}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <Tag icon={<Target className="h-3 w-3" />} value={ex.sets} />
                      <Tag icon={<Timer className="h-3 w-3" />} value={`descanso ${ex.rest}`} />
                    </div>
                  </div>
                </div>

                {/* Video */}
                <div className="relative aspect-video bg-black/60">
                  {isPlaying ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ex.videoId}?autoplay=1&rel=0`}
                      title={ex.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <button
                      onClick={() => setPlaying(ex.id)}
                      className="group absolute inset-0 flex items-center justify-center"
                      aria-label={`Reproduzir vídeo de ${ex.name}`}
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${ex.videoId}/hqdefault.jpg`}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-70"
                        loading="lazy"
                      />
                      <span className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform group-active:scale-95">
                        <Play className="h-6 w-6 fill-current" strokeWidth={0} />
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-2 border-t border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <p>{ex.cue}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center backdrop-blur">
      <p className="text-display text-xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Tag({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 font-medium text-muted-foreground">
      {icon}
      {value}
    </span>
  );
}
