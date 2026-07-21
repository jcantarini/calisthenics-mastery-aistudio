import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Check, Languages } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useT, LOCALES, type Locale } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/preferencias")({
  head: () => ({
    meta: [
      { title: "Preferências — Barra" },
      { name: "description", content: "Personalize idioma e comportamento do app Barra." },
    ],
  }),
  component: PreferenciasPage,
});

function PreferenciasPage() {
  const { t, locale, setLocale } = useT();

  const pick = (code: Locale) => {
    setLocale(code);
    toast.success(t("prefs.languageSaved"));
  };

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
          <h1 className="text-display text-3xl leading-none">{t("prefs.title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("prefs.subtitle")}</p>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-border/60 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Languages className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{t("prefs.language")}</p>
            <p className="text-xs text-muted-foreground">{t("prefs.languageDesc")}</p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background">
          {LOCALES.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => pick(l.code)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
                  aria-pressed={active}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {l.flag}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{l.label}</span>
                  {active && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
