import { createFileRoute } from "@tanstack/react-router";
import { Bell, Settings, Share2, Trophy, HeartPulse, BookOpen, Moon, LogOut } from "lucide-react";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Barra" },
      { name: "description", content: "Configurações do seu perfil de atleta na Barra." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const [state, setState] = useAppState();

  return (
    <div className="px-5 pt-12">
      <header className="flex items-center justify-between">
        <h1 className="text-display text-4xl">Perfil</h1>
        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
        </button>
      </header>

      {/* Athlete card */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface-elevated to-surface p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
            BR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Atleta · Nível {state.streak > 10 ? "III" : "II"}
            </p>
            <p className="truncate text-lg font-bold">Bruno Ribeiro</p>
            <p className="truncate text-xs text-muted-foreground">
              Desde março · {state.completedSessions.length} sessões
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-center">
          <MiniStat label="Peso" value="72kg" />
          <MiniStat label="Altura" value="1.78" />
          <MiniStat label="IMC" value="22.7" />
        </div>
      </section>

      {/* Weekly goal control */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Meta semanal
            </p>
            <p className="mt-1 text-display text-2xl">
              {state.weeklyGoal}
              <span className="ml-1 text-sm font-normal text-muted-foreground">treinos/sem</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StepBtn
              onClick={() =>
                setState((s) => ({ ...s, weeklyGoal: Math.max(1, s.weeklyGoal - 1) }))
              }
              label="−"
            />
            <StepBtn
              onClick={() =>
                setState((s) => ({ ...s, weeklyGoal: Math.min(7, s.weeklyGoal + 1) }))
              }
              label="+"
            />
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="mt-6">
        <h2 className="text-display text-xl">Conquistas</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { icon: <Trophy />, label: "10 sessões" },
            { icon: <HeartPulse />, label: "Semana perfeita" },
            { icon: <BookOpen />, label: "3 programas" },
          ].map((a, i) => (
            <div
              key={i}
              className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-surface p-4 text-center"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                {a.icon}
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-widest">{a.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Settings list */}
      <section className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-surface">
        <SettingRow icon={<Moon className="h-4 w-4" />} label="Aparência" value="Escuro" />
        <SettingRow icon={<Share2 className="h-4 w-4" />} label="Compartilhar app" />
        <SettingRow icon={<Settings className="h-4 w-4" />} label="Preferências" />
        <SettingRow icon={<LogOut className="h-4 w-4" />} label="Sair" danger />
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Barra v1.0 · Calistenia sem desculpa
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-display text-lg">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function StepBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background text-lg font-bold active:scale-95"
    >
      {label}
    </button>
  );
}

function SettingRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
}) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-surface-elevated">
      <span
        className={
          danger
            ? "grid h-8 w-8 place-items-center rounded-lg bg-destructive/15 text-destructive"
            : "grid h-8 w-8 place-items-center rounded-lg bg-background text-muted-foreground"
        }
      >
        {icon}
      </span>
      <span className={danger ? "flex-1 text-sm font-medium text-destructive" : "flex-1 text-sm font-medium"}>
        {label}
      </span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
    </button>
  );
}
