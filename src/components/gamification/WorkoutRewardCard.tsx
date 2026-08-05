import { memo } from "react";
import { Trophy, Zap } from "lucide-react";
import { DashCard, SectionTitle, CardIcon } from "@/components/dashboard/primitives";
import { StaggerItem, StaggerList } from "@/components/ui/motion";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import { tG } from "@/lib/gamification-i18n";
import { RarityBadge } from "./badges";
import type { AchievementUnlockResult } from "@/services/achievements";

/**
 * Achievements unlocked by a single workout, rendered inside the reward flow.
 */
export const WorkoutRewardCard = memo(function WorkoutRewardCard({
  unlocks,
}: {
  unlocks: AchievementUnlockResult[];
}) {
  const { locale } = useT();
  if (unlocks.length === 0) return null;

  return (
    <DashCard aria-label={tG(locale, "g.unlockedAchievements")}>
      <SectionTitle icon={<Trophy size={14} />}>
        {tG(locale, "g.unlockedAchievements")}
      </SectionTitle>
      <StaggerList as="ul" className="mt-4 space-y-3" delay={0.1}>
        {unlocks.map((u) => (
          <StaggerItem key={u.achievement.id} as="li" className="flex items-center gap-3">
            <CardIcon>
              <Trophy size={16} />
            </CardIcon>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{tAch(locale, u.titleKey)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {tAch(locale, u.descriptionKey, u.descriptionVars)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <RarityBadge rarity={u.rarity} />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Zap className="h-3 w-3" aria-hidden />+{u.xpEarned} XP
              </span>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </DashCard>
  );
});
