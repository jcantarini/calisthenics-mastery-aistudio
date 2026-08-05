import { memo } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import { tG } from "@/lib/gamification-i18n";
import { AchievementBadge, RarityBadge } from "./badges";
import { AchievementProgressBar } from "./progress-bars";
import { rarityStyle } from "./rarity";
import type { UserAchievement } from "@/services/achievements";

/**
 * Single achievement card. Read-only projection of AchievementService data.
 */
export const AchievementCard = memo(function AchievementCard({
  item,
  onSelect,
}: {
  item: UserAchievement;
  onSelect?: (item: UserAchievement) => void;
}) {
  const { locale } = useT();
  const def = item.definition;
  const locked = !item.unlocked;
  const secret = def.hidden && locked;
  const style = rarityStyle(def.rarity);

  const title = secret ? tG(locale, "g.hidden") : tAch(locale, def.titleKey);
  const description = secret
    ? "•••"
    : tAch(locale, def.descriptionKey, def.descriptionVars);

  const Comp = onSelect ? "button" : "div";

  return (
    <Comp
      {...(onSelect
        ? { type: "button" as const, onClick: () => onSelect(item) }
        : {})}
      className={cn(
        "tap flex w-full flex-col rounded-3xl border bg-surface-elevated p-4 text-left shadow-card transition-colors",
        locked ? "border-border/60 opacity-70" : style.ring,
        onSelect && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <AchievementBadge rarity={def.rarity} locked={locked} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={def.rarity} />
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Zap className="h-3 w-3" aria-hidden />+{def.xpReward} XP
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {tAch(locale, `ach.cat.${def.category}`)}
        </span>
      </div>

      {!item.unlocked && item.targetValue > 1 && !secret ? (
        <div className="mt-3">
          <AchievementProgressBar
            current={item.currentValue}
            target={item.targetValue}
            label={tG(locale, "g.completion")}
          />
        </div>
      ) : null}

      {item.unlocked && item.unlockedAt ? (
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-primary">
          {tAch(locale, "ach.unlocked")} ·{" "}
          {new Date(item.unlockedAt).toLocaleDateString(locale)}
        </p>
      ) : null}
    </Comp>
  );
});
