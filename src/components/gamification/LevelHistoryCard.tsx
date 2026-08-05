import { memo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { DashCard, SectionTitle, ActionButton } from "@/components/dashboard/primitives";
import { StaggerItem, StaggerList } from "@/components/ui/motion";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { LevelBadge } from "./badges";
import type { LevelHistoryEntry } from "@/services/progression";

const PAGE = 20;

/** Level ledger. Read-only projection of ProgressionService.getLevelHistory(). */
export const LevelHistoryCard = memo(function LevelHistoryCard({
  entries,
  loading,
}: {
  entries: LevelHistoryEntry[];
  loading?: boolean;
}) {
  const { locale } = useT();
  const [visible, setVisible] = useState(PAGE);

  return (
    <DashCard aria-label={tG(locale, "g.levelHistory")}>
      <SectionTitle icon={<TrendingUp size={14} />}>{tG(locale, "g.levelHistory")}</SectionTitle>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{tG(locale, "g.empty")}</p>
      ) : (
        <>
          <StaggerList as="ul" className="mt-4 space-y-2">
            {entries.slice(0, visible).map((e) => (
              <StaggerItem
                key={e.id}
                as="li"
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LevelBadge level={e.newLevel} size="sm" />
                    {e.levelsGained > 1 ? (
                      <span className="text-[11px] font-semibold text-accent">
                        +{e.levelsGained}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {tG(locale, "g.source")}: {e.source} ·{" "}
                    {new Date(e.createdAt).toLocaleString(locale)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
                  {e.lifetimeXP} XP
                </p>
              </StaggerItem>
            ))}
          </StaggerList>

          {visible < entries.length ? (
            <div className="mt-4 flex justify-center">
              <ActionButton onClick={() => setVisible((v) => v + PAGE)}>
                {tG(locale, "g.showMore")} ({entries.length - visible})
              </ActionButton>
            </div>
          ) : null}
        </>
      )}
    </DashCard>
  );
});
