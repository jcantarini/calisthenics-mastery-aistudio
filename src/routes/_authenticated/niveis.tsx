import { createFileRoute } from "@tanstack/react-router";
import { useLevelHistory } from "@/hooks/usePlayerProgression";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { LevelHistoryCard } from "@/components/gamification/LevelHistoryCard";
import { FadeIn } from "@/components/ui/motion";

export const Route = createFileRoute("/_authenticated/niveis")({
  head: () => ({
    meta: [
      { title: "Histórico de níveis — Sua evolução | Barra" },
      {
        name: "description",
        content:
          "Acompanhe cada subida de nível: nível alcançado, data, XP acumulado e origem da evolução.",
      },
      { property: "og:title", content: "Histórico de níveis — Sua evolução | Barra" },
      {
        property: "og:description",
        content: "Nível, data, XP e origem de cada level up conquistado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LevelHistoryPage,
});

function LevelHistoryPage() {
  const { locale } = useT();
  const { data, loading } = useLevelHistory(100);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-10 sm:px-6 sm:pt-12">
      <h1 className="text-display text-2xl">{tG(locale, "g.levelHistory")}</h1>
      <FadeIn>
        <LevelHistoryCard entries={data} loading={loading} />
      </FadeIn>
    </div>
  );
}
