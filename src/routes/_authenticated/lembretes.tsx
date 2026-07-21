import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Bell, BellOff, Plus, Trash2, Volume2, VolumeX, Vibrate, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useT } from "@/lib/i18n";
import { useAppState } from "@/lib/store";
import {
  useWorkoutReminders,
  useWorkoutReminderEngine,
  nextReminder,
  getNotifPerm,
  requestNotifPerm,
  type WorkoutReminder,
  type NotifPerm,
} from "@/lib/workout-reminders";

export const Route = createFileRoute("/_authenticated/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes de treino — Barra" },
      { name: "description", content: "Configure lembretes locais para não perder seus treinos." },
    ],
  }),
  component: LembretesPage,
});

const DAY_KEYS = ["wr.day.sun", "wr.day.mon", "wr.day.tue", "wr.day.wed", "wr.day.thu", "wr.day.fri", "wr.day.sat"] as const;

function uid() {
  return `wr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function LembretesPage() {
  const { t, locale } = useT();
  const [state] = useAppState();
  const { settings, update } = useWorkoutReminders();
  const [perm, setPerm] = useState<NotifPerm>(() => getNotifPerm());
  const [showExplainer, setShowExplainer] = useState(false);

  useWorkoutReminderEngine(state, settings, update, t);

  const next = useMemo(() => nextReminder(settings), [settings]);

  const ensurePermission = async (): Promise<boolean> => {
    const cur = getNotifPerm();
    setPerm(cur);
    if (cur === "granted") return true;
    if (cur === "unsupported") {
      toast.error(t("wr.perm.unsupported"));
      return false;
    }
    if (cur === "denied") {
      toast.error(t("wr.perm.denied"));
      return false;
    }
    setShowExplainer(true);
    return false;
  };

  const handleAllowFromExplainer = async () => {
    setShowExplainer(false);
    const p = await requestNotifPerm();
    setPerm(p);
    if (p === "granted") {
      toast.success(t("wr.perm.granted"));
      update((s) => ({ ...s, enabled: true }));
    } else if (p === "denied") {
      toast.error(t("wr.perm.denied"));
    }
  };

  const toggleEnabled = async () => {
    if (!settings.enabled) {
      const ok = await ensurePermission();
      if (!ok) return;
      update({ enabled: true });
      toast.success(t("wr.saved"));
    } else {
      update({ enabled: false });
      toast.success(t("wr.saved"));
    }
  };

  const addReminder = () => {
    const r: WorkoutReminder = { id: uid(), days: [1, 2, 3, 4, 5], time: "18:00" };
    update((s) => ({ ...s, reminders: [...s.reminders, r] }));
    toast.success(t("wr.saved"));
  };

  const patchReminder = (id: string, patch: Partial<WorkoutReminder>) => {
    update((s) => ({
      ...s,
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeReminder = (id: string) => {
    update((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
    toast.success(t("wr.removed"));
  };

  const snooze = (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000);
    patchReminder(id, { snoozeUntil: until.toISOString() });
    toast.success(t("wr.snoozed").replace("{n}", String(minutes)));
  };

  const fmtDate = (d: Date) =>
    d.toLocaleString(locale, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="px-5 pt-12">
      <Toaster position="top-center" richColors />
      <header className="flex items-center gap-3">
        <Link
          to="/perfil"
          aria-label={t("common.back")}
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-display text-3xl leading-none">{t("wr.title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("wr.subtitle")}</p>
        </div>
      </header>

      {perm === "denied" && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{t("wr.perm.deniedHint")}</p>
        </div>
      )}

      {/* Master toggle */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            {settings.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("wr.enable")}</p>
            <p className="text-xs text-muted-foreground">{t("wr.enableDesc")}</p>
          </div>
          <Switch on={settings.enabled} onChange={toggleEnabled} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          <ToggleTile
            icon={settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            label={t("wr.sound")}
            on={settings.sound}
            onChange={() => update({ sound: !settings.sound })}
          />
          <ToggleTile
            icon={<Vibrate className="h-4 w-4" />}
            label={t("wr.vibration")}
            on={settings.vibration}
            onChange={() => update({ vibration: !settings.vibration })}
          />
        </div>
      </section>

      {/* Next reminder + snooze */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-gradient-to-br from-surface-elevated to-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("wr.next")}
        </p>
        {next ? (
          <>
            <p className="mt-2 text-display text-2xl">{fmtDate(next.at)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {next.reminder.days.map((d) => t(DAY_KEYS[d])).join(" · ")} · {next.reminder.time}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SnoozeBtn onClick={() => snooze(next.reminder.id, 15)} label={`+15 ${t("common.min")}`} />
              <SnoozeBtn onClick={() => snooze(next.reminder.id, 30)} label={`+30 ${t("common.min")}`} />
              <SnoozeBtn onClick={() => snooze(next.reminder.id, 60)} label={`+60 ${t("common.min")}`} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("wr.none")}</p>
        )}
      </section>

      {/* Reminders list */}
      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl">{t("wr.reminders")}</h2>
          <button
            onClick={addReminder}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("wr.add")}
          </button>
        </div>

        {settings.reminders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-6 text-center text-sm text-muted-foreground">
            {t("wr.empty")}
          </div>
        )}

        {settings.reminders.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <input
                type="time"
                value={r.time}
                onChange={(e) => patchReminder(r.id, { time: e.target.value })}
                className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-lg font-bold tracking-wide"
              />
              <button
                onClick={() => removeReminder(r.id)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive active:scale-95"
                aria-label={t("wr.remove")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("wr.days")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_KEYS.map((k, i) => {
                  const on = r.days.includes(i);
                  return (
                    <button
                      key={k}
                      onClick={() =>
                        patchReminder(r.id, {
                          days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort(),
                        })
                      }
                      className={
                        "min-w-[42px] rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors " +
                        (on
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 bg-background text-muted-foreground")
                      }
                    >
                      {t(k)}
                    </button>
                  );
                })}
              </div>
            </div>
            {r.snoozeUntil && new Date(r.snoozeUntil).getTime() > Date.now() && (
              <p className="mt-3 text-[11px] uppercase tracking-widest text-primary">
                {t("wr.snoozedUntil")} {fmtDate(new Date(r.snoozeUntil))}
              </p>
            )}
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("wr.smartHint")}
      </p>

      {showExplainer && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setShowExplainer(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-border/60 bg-background p-6 sm:rounded-3xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-display text-2xl">{t("wr.perm.title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("wr.perm.body")}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowExplainer(false)}
                className="flex-1 rounded-full border border-border/60 px-5 py-3 text-sm font-bold"
              >
                {t("wr.perm.later")}
              </button>
              <button
                onClick={handleAllowFromExplainer}
                className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground active:scale-95"
              >
                {t("wr.perm.allow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={
        "relative h-7 w-12 shrink-0 rounded-full transition-colors " +
        (on ? "bg-primary" : "bg-border")
      }
    >
      <span
        className={
          "absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-all " +
          (on ? "left-[22px]" : "left-0.5")
        }
      />
    </button>
  );
}

function ToggleTile({
  icon,
  label,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={
        "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors " +
        (on
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/60 bg-background text-muted-foreground")
      }
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-background/60">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className={"h-2 w-2 rounded-full " + (on ? "bg-primary" : "bg-border")} />
    </button>
  );
}

function SnoozeBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-bold uppercase tracking-widest active:scale-95"
    >
      {label}
    </button>
  );
}
