import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Gift, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { ActionButton } from "@/components/dashboard/primitives";
import { XPProgressBar } from "./progress-bars";
import { CountUp } from "./CountUp";

/**
 * Level-up reveal. Elegant and restrained: one number, one bar, one message.
 * All values come from the Gamification Orchestrator result.
 */
export const LevelUpModal = memo(function LevelUpModal({
  open,
  level,
  levelsGained,
  currentXP,
  nextLevelXP,
  progressPercentage,
  isMaxLevel,
  onClose,
}: {
  open: boolean;
  level: number;
  levelsGained: number;
  currentXP: number;
  nextLevelXP: number;
  progressPercentage: number;
  isMaxLevel: boolean;
  onClose: () => void;
}) {
  const { locale } = useT();
  const reduce = useReducedMotion();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl border-border/60 bg-surface-elevated">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {tG(locale, "g.levelUp")}
          </span>

          <DialogTitle className="sr-only">{tG(locale, "g.levelUp")}</DialogTitle>

          <motion.p
            className="mt-4 text-display text-6xl leading-none text-primary"
            initial={reduce ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <CountUp value={level} duration={700} />
          </motion.p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {tG(locale, "g.level")}
            {levelsGained > 1 ? ` · +${levelsGained}` : ""}
          </p>

          <DialogDescription className="mt-3 text-sm text-muted-foreground">
            {tG(locale, "g.levelUpDesc")}
          </DialogDescription>

          <div className="mt-5 w-full">
            <XPProgressBar
              percentage={progressPercentage}
              currentXP={currentXP}
              nextLevelXP={nextLevelXP}
              isMaxLevel={isMaxLevel}
              label={tG(locale, "g.nextLevel")}
              maxLabel={tG(locale, "g.maxLevel")}
            />
          </div>

          <div className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-background/40 p-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Gift className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-xs text-muted-foreground">{tG(locale, "g.rewardsSoon")}</p>
          </div>

          <ActionButton variant="primary" className="mt-6 w-full" onClick={onClose}>
            {tG(locale, "g.continue")}
          </ActionButton>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
});
