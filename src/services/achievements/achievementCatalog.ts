// Achievements Engine — the single typed catalog. Mirrors public.achievements.
// User facing text lives in i18n keys, never inline in business logic.

import type { AchievementCategory, AchievementDefinition } from "./achievementTypes";

function def(a: AchievementDefinition): AchievementDefinition {
  return a;
}

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  /* ---------------- Onboarding ---------------- */
  def({
    id: "profile_completed",
    category: "onboarding",
    titleKey: "ach.profile_completed.title",
    descriptionKey: "ach.desc.profile",
    icon: "user-check",
    metric: "profile_completed",
    progressType: "boolean",
    target: 1,
    xpReward: 50,
    rarity: "common",
    hidden: false,
  }),
  def({
    id: "assessment_completed",
    category: "onboarding",
    titleKey: "ach.assessment_completed.title",
    descriptionKey: "ach.desc.assessment",
    icon: "clipboard-check",
    metric: "assessment_completed",
    progressType: "boolean",
    target: 1,
    xpReward: 50,
    rarity: "common",
    hidden: false,
  }),

  /* ---------------- Workouts ---------------- */
  ...([
    ["workouts_1", 1, 50, "common"],
    ["workouts_5", 5, 100, "common"],
    ["workouts_10", 10, 100, "uncommon"],
    ["workouts_25", 25, 200, "rare"],
    ["workouts_50", 50, 400, "epic"],
    ["workouts_100", 100, 1000, "legendary"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "workouts",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.workouts",
      descriptionVars: { n: target },
      icon: "dumbbell",
      metric: "workouts_completed",
      progressType: "cumulative",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),

  /* ---------------- Consistency ---------------- */
  ...([
    ["streak_3", 3, 50, "common"],
    ["streak_7", 7, 100, "uncommon"],
    ["streak_14", 14, 200, "rare"],
    ["streak_30", 30, 400, "epic"],
    ["streak_100", 100, 1000, "legendary"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "consistency",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.streak",
      descriptionVars: { n: target },
      icon: "flame",
      metric: "streak_days",
      progressType: "streak",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),

  /* ---------------- Programs ---------------- */
  def({
    id: "week_1",
    category: "programs",
    titleKey: "ach.week_1.title",
    descriptionKey: "ach.desc.weeks",
    descriptionVars: { n: 1 },
    icon: "calendar-check",
    metric: "weeks_completed",
    progressType: "cumulative",
    target: 1,
    xpReward: 100,
    rarity: "common",
    hidden: false,
  }),
  ...([
    ["program_1", 1, 200, "rare"],
    ["programs_3", 3, 400, "epic"],
    ["programs_10", 10, 1000, "legendary"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "programs",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.programs",
      descriptionVars: { n: target },
      icon: "trophy",
      metric: "programs_completed",
      progressType: "cumulative",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),

  /* ---------------- Strength ---------------- */
  ...([
    ["pushups_100", 100, 100, "common"],
    ["pushups_500", 500, 200, "rare"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "strength",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.pushupsTotal",
      descriptionVars: { n: target },
      icon: "arrow-down-up",
      metric: "pushups_total",
      progressType: "cumulative",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),
  def({
    id: "pullups_10_session",
    category: "strength",
    titleKey: "ach.pullups_10_session.title",
    descriptionKey: "ach.desc.pullupsSession",
    descriptionVars: { n: 10 },
    icon: "chevrons-up",
    metric: "pullups_session",
    progressType: "session",
    target: 10,
    xpReward: 200,
    rarity: "rare",
    hidden: false,
  }),
  ...([
    ["pullups_25", 25, 100, "uncommon"],
    ["pullups_100", 100, 400, "epic"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "strength",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.pullupsTotal",
      descriptionVars: { n: target },
      icon: "chevrons-up",
      metric: "pullups_total",
      progressType: "cumulative",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),
  ...([
    ["plank_60", 60, 100, "uncommon"],
    ["plank_120", 120, 200, "rare"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "strength",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.plank",
      descriptionVars: { n: target },
      icon: "timer",
      metric: "plank_seconds_session",
      progressType: "duration",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),

  /* ---------------- Skills ---------------- */
  ...([
    ["skill_l_sit", "l_sit", 200, "rare", false],
    ["skill_handstand", "handstand", 400, "epic", false],
    ["skill_muscle_up", "muscle_up", 400, "epic", false],
    ["skill_front_lever", "front_lever", 1000, "legendary", false],
    ["skill_back_lever", "back_lever", 400, "epic", false],
    ["skill_human_flag", "human_flag", 1000, "legendary", true],
    ["skill_planche", "planche", 1000, "legendary", true],
  ] as const).map(([id, , xp, rarity, hidden]) =>
    def({
      id,
      category: "skills",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.skill",
      descriptionVars: { skill: `ach.${id}.title` },
      icon: "sparkles",
      metric: id as AchievementDefinition["metric"],
      progressType: "boolean",
      target: 1,
      xpReward: xp,
      rarity,
      hidden,
    }),
  ),

  /* ---------------- Goals ---------------- */
  ...([
    ["goals_1", 1, 50, "common"],
    ["goals_5", 5, 100, "uncommon"],
    ["goals_10", 10, 200, "rare"],
  ] as const).map(([id, target, xp, rarity]) =>
    def({
      id,
      category: "goals",
      titleKey: `ach.${id}.title`,
      descriptionKey: "ach.desc.goals",
      descriptionVars: { n: target },
      icon: "target",
      metric: "goals_completed",
      progressType: "cumulative",
      target,
      xpReward: xp,
      rarity,
      hidden: false,
    }),
  ),
] as const;

const BY_ID = new Map(ACHIEVEMENT_CATALOG.map((a) => [a.id, a]));

export function getAchievement(id: string): AchievementDefinition | undefined {
  return BY_ID.get(id);
}

export function achievementsByCategory(
  category: AchievementCategory,
): AchievementDefinition[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.category === category);
}

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = [
  "onboarding",
  "workouts",
  "consistency",
  "programs",
  "strength",
  "skills",
  "goals",
];
