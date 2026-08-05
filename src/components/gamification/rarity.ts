import type { AchievementRarity } from "@/services/achievements";

/**
 * Presentation-only rarity styling. No rules, no logic — just tokens.
 * Every value comes from the design system (no hardcoded colors).
 */
export interface RarityStyle {
  /** Chip / badge surface. */
  chip: string;
  /** Card border + glow treatment. */
  ring: string;
  /** Icon tile treatment. */
  tile: string;
  /** Text tone. */
  text: string;
}

export const RARITY_STYLES: Record<AchievementRarity, RarityStyle> = {
  common: {
    chip: "border-border/60 bg-muted text-muted-foreground",
    ring: "border-border/60",
    tile: "bg-muted text-muted-foreground",
    text: "text-muted-foreground",
  },
  uncommon: {
    chip: "border-primary/30 bg-primary/10 text-primary",
    ring: "border-primary/30",
    tile: "bg-primary/10 text-primary",
    text: "text-primary",
  },
  rare: {
    chip: "border-primary/50 bg-primary/15 text-primary",
    ring: "border-primary/50 shadow-glow",
    tile: "bg-primary/20 text-primary",
    text: "text-primary",
  },
  epic: {
    chip: "border-accent/50 bg-accent/15 text-accent",
    ring: "border-accent/50",
    tile: "bg-accent/20 text-accent",
    text: "text-accent",
  },
  legendary: {
    chip: "border-accent/60 bg-gradient-to-r from-accent/25 to-primary/25 text-accent",
    ring: "border-accent/60 shadow-glow",
    tile: "bg-gradient-to-br from-accent/30 to-primary/30 text-accent",
    text: "text-accent",
  },
};

export const RARITY_ORDER: AchievementRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export function rarityStyle(rarity: AchievementRarity): RarityStyle {
  return RARITY_STYLES[rarity] ?? RARITY_STYLES.common;
}
