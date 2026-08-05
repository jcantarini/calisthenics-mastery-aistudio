import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { tAch } from "@/lib/achievements-i18n";
import { tG } from "@/lib/gamification-i18n";
import { AchievementBadge, RarityBadge } from "./badges";
import { ActionButton } from "@/components/dashboard/primitives";
import type { AchievementUnlockResult } from "@/services/achievements";

/**
 * Achievement unlock modal. Pure presentation: everything comes from the
 * unlock result produced by the Achievements Engine.
 */
export const AchievementModal = memo(function AchievementModal({
  unlock,
  open,
  onClose,
}: {
  unlock: AchievementUnlockResult | null;
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useT();
  const reduce = useReducedMotion();
  if (!unlock) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl border-border/60 bg-surface-elevated">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <AchievementBadge rarity={unlock.rarity} size="lg" />
          <DialogTitle className="mt-4 text-lg font-bold">
            {tAch(locale, unlock.titleKey)}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {tAch(locale, unlock.descriptionKey, unlock.descriptionVars)}
          </DialogDescription>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <RarityBadge rarity={unlock.rarity} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" aria-hidden />+{unlock.xpEarned} XP
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-medium">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              {tG(locale, "g.achievements")}
            </span>
          </div>

          <ActionButton variant="primary" className="mt-6 w-full" onClick={onClose}>
            {tG(locale, "g.close")}
          </ActionButton>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
});
