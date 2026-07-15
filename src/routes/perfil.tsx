import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Bell,
  Settings,
  Share2,
  Trophy,
  HeartPulse,
  BookOpen,
  Moon,
  LogOut,
  Pencil,
  X,
} from "lucide-react";
import { useAppState, initialsFrom, type Profile } from "@/lib/store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Barra" },
      { name: "description", content: "Configurações do seu perfil de atleta na Barra." },
    ],
  }),
  component: PerfilPage,
});

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(60, "Máximo de 60 caracteres"),
  weightKg: z
    .number({ message: "Peso inválido" })
    .min(30, "Mínimo 30 kg")
    .max(250, "Máximo 250 kg"),
  heightCm: z
    .number({ message: "Altura inválida" })
    .min(120, "Mínimo 120 cm")
    .max(230, "Máximo 230 cm"),
  birthYear: z
    .number({ message: "Ano inválido" })
    .int()
    .min(1920, "Ano inválido")
    .max(new Date().getFullYear() - 5, "Ano inválido"),
});

function PerfilPage() {
  const [state, setState] = useAppState();
  const [editing, setEditing] = useState(false);
  const { profile } = state;
  const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
  const age = new Date().getFullYear() - profile.birthYear;

  return (
    <div className="px-5 pt-12">
      <Toaster position="top-center" richColors />
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
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface-elevated to-surface p-5 shadow-card">
        <button
          onClick={() => setEditing(true)}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary active:scale-95"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
            {profile.initials}
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Atleta · Nível {state.streak > 10 ? "III" : "II"}
            </p>
            <p className="truncate text-lg font-bold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Desde {profile.memberSince} · {state.completedSessions.length} sessões
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border/60 pt-4 text-center">
          <MiniStat label="Peso" value={`${profile.weightKg}kg`} />
          <MiniStat label="Altura" value={(profile.heightCm / 100).toFixed(2)} />
          <MiniStat label="IMC" value={bmi.toFixed(1)} />
          <MiniStat label="Idade" value={String(age)} />
        </div>
      </section>

      {editing && (
        <EditProfileSheet
          initial={profile}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            setState((s) => ({ ...s, profile: next }));
            setEditing(false);
            toast.success("Perfil atualizado");
          }}
        />
      )}


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
