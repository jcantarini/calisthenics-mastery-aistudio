import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import {
  Bell,
  Settings,
  Share2,
  Trophy,
  HeartPulse,
  BookOpen,
  Moon,
  Sun,
  LogOut,
  Pencil,
  X,
  Mail,
  MessageCircle,
  Send,
  Link2,
  Facebook,
  Twitter,
} from "lucide-react";
import { useAppState, initialsFrom, type Profile, type Sex } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuthSession, profileFromUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
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
  const [sharing, setSharing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { t } = useT();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useAuthSession();
  const authProfile = profileFromUser(user);
  const navigate = useNavigate();
  const { profile } = state;
  const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
  const age = new Date().getFullYear() - profile.birthYear;

  const displayName = authProfile?.full_name || profile.name;
  const displayInitials = initialsFrom(displayName) || profile.initials || "?";
  const displayEmail = authProfile?.email;
  const displayAvatar = authProfile?.avatar_url;

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast.success(t("auth.signedOut"));
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(t("auth.error"), {
        description: err instanceof Error ? err.message : String(err),
      });
      setSigningOut(false);
    }
  };

  return (
    <div className="px-5 pt-12">
      <header className="flex items-center justify-between">
        <h1 className="text-display text-4xl">{t("profile.title")}</h1>
        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface"
          aria-label="Notifications"
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
          {t("profile.edit")}
        </button>
        <div className="flex items-center gap-4">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-primary/40"
              width={64}
              height={64}
            />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
              {displayInitials}
            </div>
          )}
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("profile.athlete")} {state.streak > 10 ? "III" : "II"}
            </p>
            <p className="truncate text-lg font-bold">{displayName}</p>
            {displayEmail && (
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            )}
            <p className="truncate text-[11px] text-muted-foreground">
              {t("profile.since")} {profile.memberSince} · {state.completedSessions.length} {t("profile.sessions")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border/60 pt-4 text-center">
          <MiniStat label={t("profile.stat.weight")} value={`${profile.weightKg}kg`} />
          <MiniStat label={t("profile.stat.height")} value={(profile.heightCm / 100).toFixed(2)} />
          <MiniStat label={t("profile.stat.bmi")} value={bmi.toFixed(1)} />
          <MiniStat label={t("profile.stat.age")} value={String(age)} />
        </div>
      </section>

      {editing && (
        <EditProfileSheet
          initial={profile}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            setState((s) => ({ ...s, profile: next }));
            setEditing(false);
            toast.success(t("profile.updated"));
          }}
        />
      )}


      {/* Weekly goal control */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("profile.weeklyGoal")}
            </p>
            <p className="mt-1 text-display text-2xl">
              {state.weeklyGoal}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{t("profile.perWeek")}</span>
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
        <h2 className="text-display text-xl">{t("profile.achievements")}</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { icon: <Trophy />, label: t("profile.ach.sessions10") },
            { icon: <HeartPulse />, label: t("profile.ach.perfectWeek") },
            { icon: <BookOpen />, label: t("profile.ach.programs3") },
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
        <SettingRow
          icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          label={t("profile.appearance")}
          value={theme === "dark" ? t("profile.dark") : t("profile.light")}
          onClick={toggleTheme}
        />
        <SettingRow
          icon={<Share2 className="h-4 w-4" />}
          label={t("profile.share")}
          onClick={() => setSharing(true)}
        />
        <SettingRow icon={<Bell className="h-4 w-4" />} label={t("profile.reminders")} to="/lembretes" />
        <SettingRow icon={<Settings className="h-4 w-4" />} label={t("profile.settings")} to="/preferencias" />
        <SettingRow
          icon={<LogOut className="h-4 w-4" />}
          label={signingOut ? t("auth.signingOut") : t("profile.logout")}
          danger
          onClick={handleLogout}
        />
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("profile.footer")}
      </p>
      {sharing && <ShareSheet onClose={() => setSharing(false)} />}
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
  to,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
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
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-surface-elevated"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-surface-elevated"
    >
      {inner}
    </button>
  );
}

function EditProfileSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: Profile;
  onClose: () => void;
  onSave: (next: Profile) => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(initial.name);
  const [weight, setWeight] = useState(String(initial.weightKg));
  const [height, setHeight] = useState(String(initial.heightCm));
  const [birthYear, setBirthYear] = useState(String(initial.birthYear));
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      prevActive?.focus?.();
    };
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({
      name,
      weightKg: Number(weight.replace(",", ".")),
      heightCm: Number(height),
      birthYear: Number(birthYear),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    onSave({
      ...initial,
      name: parsed.data.name,
      initials: initialsFrom(parsed.data.name),
      weightKg: Math.round(parsed.data.weightKg * 10) / 10,
      heightCm: Math.round(parsed.data.heightCm),
      birthYear: parsed.data.birthYear,
      sex,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        aria-describedby={Object.keys(errors).length ? `${titleId}-err` : undefined}
        className="w-full max-w-md rounded-t-3xl border-t border-border/60 bg-surface-elevated p-5 pb-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-display text-2xl">{t("profile.editTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 min-h-11 min-w-11 place-items-center rounded-full border border-border/60 bg-background"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {Object.keys(errors).length > 0 && (
          <p id={`${titleId}-err`} className="sr-only" role="alert">
            {Object.values(errors).join(". ")}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <Field label={t("profile.name")} error={errors.name}>
            {(p) => (
              <input
                {...p}
                ref={firstFieldRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="name"
                className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder={t("profile.name")}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("profile.weight")} error={errors.weightKg}>
              {(p) => (
                <input
                  {...p}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  maxLength={5}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="72"
                />
              )}
            </Field>
            <Field label={t("profile.height")} error={errors.heightCm}>
              {(p) => (
                <input
                  {...p}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  inputMode="numeric"
                  maxLength={3}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  placeholder="178"
                />
              )}
            </Field>
          </div>
          <Field label={t("profile.birthYear")} error={errors.birthYear}>
            {(p) => (
              <input
                {...p}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                placeholder="1995"
              />
            )}
          </Field>
          <fieldset>
            <legend className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("profile.sex")}
            </legend>
            <div role="radiogroup" aria-label={t("profile.sex")} className="grid grid-cols-2 gap-2">
              {(["masculino", "feminino"] as const).map((s) => {
                const selected = sex === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSex(s)}
                    className={
                      selected
                        ? "rounded-2xl border border-primary bg-primary/10 px-4 py-3 text-sm font-bold capitalize text-primary"
                        : "rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-medium capitalize text-muted-foreground"
                    }
                  >
                    {s === "masculino" ? t("profile.male") : t("profile.female")}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-glow active:scale-[0.98]"
        >
          {t("profile.saveChanges")}
        </button>
      </form>
    </div>
  );
}

type FieldRenderProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children:
    | React.ReactNode
    | ((props: FieldRenderProps) => React.ReactNode);
}) {
  const inputId = useId();
  const errorId = `${inputId}-err`;
  const rendered =
    typeof children === "function"
      ? children({
          id: inputId,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
        })
      : children;
  return (
    <div className="block">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      {rendered}
      {error && (
        <span id={errorId} className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

function ShareSheet({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const url = typeof window !== "undefined" ? window.location.origin : "";
  const title = t("share.title");
  const text = t("share.text");
  const message = `${text} ${url}`.trim();
  const enc = encodeURIComponent;

  const openExternal = (href: string) => {
    if (typeof window === "undefined") return;
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t("share.copied"));
      } else if (typeof window !== "undefined") {
        window.prompt(title, url);
      }
    } catch {
      if (typeof window !== "undefined") window.prompt(title, url);
    }
    onClose();
  };

  const options: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    className: string;
    onClick: () => void;
  }> = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      className: "bg-[#25D366]/15 text-[#25D366]",
      onClick: () => openExternal(`https://wa.me/?text=${enc(message)}`),
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <Send className="h-5 w-5" />,
      className: "bg-[#229ED9]/15 text-[#229ED9]",
      onClick: () =>
        openExternal(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`),
    },
    {
      key: "email",
      label: t("share.email"),
      icon: <Mail className="h-5 w-5" />,
      className: "bg-primary/15 text-primary",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.location.href = `mailto:?subject=${enc(title)}&body=${enc(message)}`;
        }
        onClose();
      },
    },
    {
      key: "twitter",
      label: "X / Twitter",
      icon: <Twitter className="h-5 w-5" />,
      className: "bg-foreground/10 text-foreground",
      onClick: () =>
        openExternal(`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`),
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      className: "bg-[#1877F2]/15 text-[#1877F2]",
      onClick: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`),
    },
    {
      key: "copy",
      label: t("share.copyLink"),
      icon: <Link2 className="h-5 w-5" />,
      className: "bg-muted text-muted-foreground",
      onClick: copy,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("share.sheetTitle")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border-t border-border/60 bg-surface-elevated p-5 pb-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-display text-2xl">{t("share.sheetTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={o.onClick}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background p-3 text-center transition-transform active:scale-95"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-full ${o.className}`}>
                {o.icon}
              </span>
              <span className="text-[11px] font-semibold leading-tight">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
