import { memo, useState } from "react";
import { StaggerItem, StaggerList } from "@/components/ui/motion";
import { AchievementCard } from "./AchievementCard";
import { ActionButton } from "@/components/dashboard/primitives";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import type { UserAchievement } from "@/services/achievements";

const PAGE = 12;

/**
 * Responsive achievement grid with incremental rendering — long catalogs stay
 * cheap on mobile by mounting a page at a time instead of the whole list.
 */
export const AchievementGrid = memo(function AchievementGrid({
  items,
  onSelect,
}: {
  items: UserAchievement[];
  onSelect?: (item: UserAchievement) => void;
}) {
  const { locale } = useT();
  const [visible, setVisible] = useState(PAGE);

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{tG(locale, "g.noResults")}</p>;
  }

  return (
    <>
      <StaggerList
        as="ul"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.slice(0, visible).map((item) => (
          <StaggerItem key={item.achievementId} as="li">
            <AchievementCard item={item} onSelect={onSelect} />
          </StaggerItem>
        ))}
      </StaggerList>

      {visible < items.length ? (
        <div className="mt-4 flex justify-center">
          <ActionButton onClick={() => setVisible((v) => v + PAGE)}>
            {tG(locale, "g.showMore")} ({items.length - visible})
          </ActionButton>
        </div>
      ) : null}
    </>
  );
});

/** Compact list variant, used inside cards and summaries. */
export const AchievementList = memo(function AchievementList({
  items,
  onSelect,
}: {
  items: UserAchievement[];
  onSelect?: (item: UserAchievement) => void;
}) {
  const { locale } = useT();
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{tG(locale, "g.empty")}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.achievementId}>
          <AchievementCard item={item} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
});
