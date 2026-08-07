import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Trophy } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import { tG } from "@/lib/gamification-i18n";
import { DashCard, SectionTitle, StatTile } from "@/components/dashboard/primitives";
import { ProgramProgressBar } from "@/components/gamification/progress-bars";
import { AchievementGrid, AchievementList } from "@/components/gamification/AchievementGrid";
import { RARITY_ORDER } from "@/components/gamification/rarity";
import { cn } from "@/lib/utils";
import type { AchievementCategory, AchievementRarity } from "@/services/achievements";

const CATEGORIES: AchievementCategory[] = [
  "onboarding",
  "workouts",
  "consistency",
  "programs",
  "strength",
  "skills",
  "goals",
];

type StatusFilter = "all" | "unlocked" | "locked";

export const Route = createFileRoute("/_authenticated/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — Progresso e recompensas | Barra" },
      {
        name: "description",
        content:
          "Explore todas as conquistas de calistenia: categorias, raridade, progresso, conquistas secretas e recompensas em XP.",
      },
      { property: "og:title", content: "Conquistas — Progresso e recompensas | Barra" },
      {
        property: "og:description",
        content: "Categorias, raridades e progresso de todas as conquistas do app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AchievementsPage,
});

const chip = (active: boolean) =>
  cn(
    "tap min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors",
    active
      ? "border-primary/50 bg-primary/15 text-primary"
      : "border-border/60 bg-background/40 text-muted-foreground",
  );

function AchievementsPage() {
  const { locale } = useT();
  const { data, loading } = useAchievements();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [rarity, setRarity] = useState<AchievementRarity | "all">("all");

  const unlocked = useMemo(() => data.filter((a) => a.unlocked), [data]);
  const completion = data.length > 0 ? (unlocked.length / data.length) * 100 : 0;

  const recent = useMemo(
    () =>
      [...unlocked]
        .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))
        .slice(0, 3),
    [unlocked],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((a) => {
      if (status === "unlocked" && !a.unlocked) return false;
      if (status === "locked" && a.unlocked) return false;
      if (category !== "all" && a.definition.category !== category) return false;
      if (rarity !== "all" && a.definition.rarity !== rarity) return false;
      if (!q) return true;
      const secret = a.definition.hidden && !a.unlocked;
      if (secret) return false;
      const title = tAch(locale, a.definition.titleKey).toLowerCase();
      const desc = tAch(
        locale,
        a.definition.descriptionKey,
        a.definition.descriptionVars,
      ).toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [data, status, category, rarity, query, locale]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-10 sm:px-6 sm:pt-12">
      <h1 className="text-display text-2xl">{tG(locale, "g.achievements")}</h1>

      <DashCard>
        <SectionTitle icon={<Trophy size={14} />}>{tG(locale, "g.completion")}</SectionTitle>
        <div className="mt-4">
          <ProgramProgressBar percentage={completion} label={tG(locale, "g.completion")} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <StatTile as="dl" label={tG(locale, "g.unlocked")} value={unlocked.length} />
          <StatTile as="dl" label={tG(locale, "g.all")} value={data.length} />
          <StatTile
            as="dl"
            label={tG(locale, "g.completion")}
            value={`${Math.round(completion)}%`}
          />
        </dl>
      </DashCard>

      {recent.length > 0 ? (
        <DashCard>
          <SectionTitle icon={<Trophy size={14} />}>
            {tG(locale, "g.recentlyUnlocked")}
          </SectionTitle>
          <div className="mt-4">
            <AchievementList items={recent} />
          </div>
        </DashCard>
      ) : null}

      <DashCard>
        <label className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">{tG(locale, "g.search")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tG(locale, "g.search")}
            className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={tG(locale, "g.all")}>
          {(["all", "unlocked", "locked"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={chip(status === s)}
            >
              {tG(locale, s === "all" ? "g.all" : s === "unlocked" ? "g.unlocked" : "g.locked")}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={tG(locale, "g.rarity")}>
          <button
            type="button"
            aria-pressed={rarity === "all"}
            onClick={() => setRarity("all")}
            className={chip(rarity === "all")}
          >
            {tG(locale, "g.rarity")}
          </button>
          {RARITY_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rarity === r}
              onClick={() => setRarity(r)}
              className={chip(rarity === r)}
            >
              {tAch(locale, `ach.rarity.${r}`)}
            </button>
          ))}
        </div>

        <div
          className="mt-2 flex flex-wrap gap-2"
          role="group"
          aria-label={tG(locale, "g.achievements")}
        >
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={chip(category === "all")}
          >
            {tG(locale, "g.all")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={chip(category === c)}
            >
              {tAch(locale, `ach.cat.${c}`)}
            </button>
          ))}
        </div>
      </DashCard>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <AchievementGrid items={filtered} />
      )}
    </div>
  );
}
