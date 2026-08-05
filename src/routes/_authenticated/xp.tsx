import { createFileRoute } from "@tanstack/react-router";
import { useXPHistory } from "@/hooks/useXPHistory";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { XPHistoryCard } from "@/components/gamification/XPHistoryCard";
import { FadeIn } from "@/components/ui/motion";

export const Route = createFileRoute("/_authenticated/xp")({
  head: () => ({
    meta: [
      { title: "Histórico de XP — Cada ponto conquistado | Barra" },
      {
        name: "description",
        content:
          "Veja todo o XP ganho no app: motivo, data, quantidade e total acumulado a cada treino, conquista e meta.",
      },
      { property: "og:title", content: "Histórico de XP — Cada ponto conquistado | Barra" },
      {
        property: "og:description",
        content: "Motivo, data, XP ganho e total acumulado de cada evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: XPHistoryPage,
});

function XPHistoryPage() {
  const { locale } = useT();
  const { data, loading } = useXPHistory(100);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-10 sm:px-6 sm:pt-12">
      <h1 className="text-display text-2xl">{tG(locale, "g.xpHistory")}</h1>
      <FadeIn>
        <XPHistoryCard entries={data} loading={loading} />
      </FadeIn>
    </div>
  );
}
