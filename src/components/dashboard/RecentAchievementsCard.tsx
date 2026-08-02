import { memo } from "react";
import { Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import { useRecentAchievements } from "@/hooks/useAchievements";
import { DashCard, CardIcon, SectionTitle } from "./primitives";

const RARITY_TONE: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-primary",
  rare: "text-primary",
  epic: "text-accent",
  legendary: "text-accent",
};

/** Read-only widget. All logic lives in AchievementService. */
export const RecentAchievementsCard = memo(function RecentAchievementsCard() {
  const { locale } = useT();
  const { data, loading } = useRecentAchievements(3);

  if (loading) {
    return (
      <DashCard>
        <div className="h-5 w-32 animate-pulse rounded-full bg-muted/50" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      </DashCard>
    );
  }

  return (
    <DashCard>
      <SectionTitle icon={<Trophy size={14} />}>{tAch(locale, "ach.recent")}</SectionTitle>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{tAch(locale, "ach.empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((item) => (
            <li key={item.achievementId} className="flex items-center gap-3">
              <CardIcon>
                <Trophy size={16} />
              </CardIcon>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {tAch(locale, item.definition.titleKey)}
                </p>
                <p
                  className={`truncate text-xs ${RARITY_TONE[item.definition.rarity] ?? "text-muted-foreground"}`}
                >
                  {tAch(locale, `ach.rarity.${item.definition.rarity}`)} · +{item.xpAwarded} XP
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
});
