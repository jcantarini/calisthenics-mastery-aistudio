import { memo, useState } from "react";
import { Zap } from "lucide-react";
import { DashCard, SectionTitle, ActionButton } from "@/components/dashboard/primitives";
import { StaggerItem, StaggerList } from "@/components/ui/motion";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import type { XPEntry } from "@/services/xp";

const PAGE = 20;

/** XP ledger. Read-only projection of XPService.getXPHistory(). */
export const XPHistoryCard = memo(function XPHistoryCard({
  entries,
  loading,
}: {
  entries: XPEntry[];
  loading?: boolean;
}) {
  const { locale } = useT();
  const [visible, setVisible] = useState(PAGE);

  return (
    <DashCard aria-label={tG(locale, "g.xpHistory")}>
      <SectionTitle icon={<Zap size={14} />}>{tG(locale, "g.xpHistory")}</SectionTitle>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
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
                  <p className="truncate text-sm font-semibold">{e.reason || e.eventType}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString(locale)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold tabular-nums ${e.amount >= 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {e.amount} XP
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {tG(locale, "g.runningTotal")}: {e.runningTotal}
                  </p>
                </div>
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
