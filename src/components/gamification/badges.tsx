import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Flame, Lock, Shield, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { tAch } from "@/lib/achievements-i18n";
import { useT } from "@/lib/i18n";
import { rarityStyle } from "./rarity";
import type { AchievementRarity } from "@/services/achievements";

/** Subtle reveal wrapper shared by every badge. */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reduce ? 0.15 : 0.35,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.span>
  );
}

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-5";

/** Player level badge. */
export const LevelBadge = memo(function LevelBadge({
  level,
  size = "md",
  className,
}: {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { locale } = useT();
  const label =
    locale === "en"
      ? "Level"
      : locale === "fr"
        ? "Niveau"
        : locale === "it"
          ? "Livello"
          : locale === "es"
            ? "Nivel"
            : "Nível";
  return (
    <Reveal>
      <span
        className={cn(
          CHIP,
          "border-primary/30 bg-primary/10 text-primary",
          size === "sm" && "px-2 py-0.5 text-[10px]",
          size === "lg" && "px-3.5 py-1.5 text-sm",
          className,
        )}
      >
        <Shield className="h-3.5 w-3.5" aria-hidden />
        {label} {level}
      </span>
    </Reveal>
  );
});

/** Rarity badge — one visual identity per rarity tier. */
export const RarityBadge = memo(function RarityBadge({
  rarity,
  className,
}: {
  rarity: AchievementRarity;
  className?: string;
}) {
  const { locale } = useT();
  return (
    <span className={cn(CHIP, rarityStyle(rarity).chip, className)}>
      {tAch(locale, `ach.rarity.${rarity}`)}
    </span>
  );
});

/** Achievement badge — icon tile tinted by rarity, dimmed when locked. */
export const AchievementBadge = memo(function AchievementBadge({
  rarity,
  locked = false,
  size = "md",
  delay = 0,
}: {
  rarity: AchievementRarity;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
  delay?: number;
}) {
  const style = rarityStyle(rarity);
  return (
    <Reveal delay={delay}>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-2xl",
          size === "sm" && "h-9 w-9",
          size === "md" && "h-11 w-11",
          size === "lg" && "h-16 w-16 rounded-3xl",
          locked ? "bg-muted text-muted-foreground/70" : style.tile,
        )}
      >
        {locked ? (
          <Lock className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
        ) : (
          <Trophy className={size === "lg" ? "h-7 w-7" : "h-4 w-4"} />
        )}
      </span>
    </Reveal>
  );
});

/** Streak badge. */
export const StreakBadge = memo(function StreakBadge({
  days,
  className,
}: {
  days: number;
  className?: string;
}) {
  return (
    <span className={cn(CHIP, "border-accent/40 bg-accent/10 text-accent", className)}>
      <Flame className="h-3.5 w-3.5" aria-hidden />
      {days}
    </span>
  );
});

/** Goal badge — placeholder surface for the future Goals engine. */
export const GoalBadge = memo(function GoalBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span className={cn(CHIP, "border-border/60 bg-background/40 text-foreground", className)}>
      <Target className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="max-w-40 truncate">{label}</span>
    </span>
  );
});
