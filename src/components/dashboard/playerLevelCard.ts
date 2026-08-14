import type { Locale } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";

/** Presentation-only projection of the level progress for PlayerLevelCard. */
export type PlayerLevelProgressView = {
  level: number;
  currentXP: number;
  lifetimeXP: number;
  xpToNextLevel: number;
  nextLevelXP: number;
  progressPercentage: number;
  isMaxLevel: boolean;
};

export type PlayerLevelLabels = {
  cardLabel: string;
  title: string;
  badge: string;
  nextTarget: string;
  progressLabel: string;
  lifetimeLabel: string;
  lifetimeValue: string;
  remainingLabel: string;
  remainingValue: string;
  nextLevelLabel: string;
  nextLevelValue: string;
  currentXPValue: string;
};

/** Pure label builder — no business logic, only formatting of given values. */
export function buildPlayerLevelLabels(
  locale: Locale,
  progress: PlayerLevelProgressView,
): PlayerLevelLabels {
  const maxLevel = tG(locale, "g.maxLevel");
  return {
    cardLabel: tG(locale, "g.playerProfile"),
    title: tG(locale, "g.level"),
    badge: `${tG(locale, "g.level")} ${progress.level}`,
    nextTarget: progress.isMaxLevel ? maxLevel : `${progress.nextLevelXP} XP`,
    progressLabel: progress.isMaxLevel
      ? maxLevel
      : `${tG(locale, "g.nextLevel")}: ${progress.level + 1}`,
    lifetimeLabel: tG(locale, "g.lifetimeXP"),
    lifetimeValue: `${progress.lifetimeXP}`,
    remainingLabel: tG(locale, "g.remaining"),
    remainingValue: progress.isMaxLevel ? "—" : `${progress.xpToNextLevel} XP`,
    nextLevelLabel: tG(locale, "g.nextLevel"),
    nextLevelValue: progress.isMaxLevel ? maxLevel : `${progress.level + 1}`,
    currentXPValue: `${progress.currentXP} XP`,
  };
}
