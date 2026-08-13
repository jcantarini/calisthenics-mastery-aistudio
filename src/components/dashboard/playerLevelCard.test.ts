import { describe, expect, it } from "vitest";
import { buildPlayerLevelLabels, type PlayerLevelProgressView } from "./playerLevelCard";

const progress: PlayerLevelProgressView = {
  level: 7,
  currentXP: 320,
  lifetimeXP: 4820,
  xpToNextLevel: 180,
  nextLevelXP: 500,
  progressPercentage: 64,
  isMaxLevel: false,
};

const maxed: PlayerLevelProgressView = {
  ...progress,
  level: 100,
  xpToNextLevel: 0,
  isMaxLevel: true,
};

describe("PlayerLevelCard labels", () => {
  it("localizes labels in Portuguese", () => {
    const l = buildPlayerLevelLabels("pt", progress);
    expect(l.cardLabel).toBe("Perfil do jogador");
    expect(l.title).toBe("Nível");
    expect(l.badge).toBe("Nível 7");
    expect(l.lifetimeLabel).toBe("XP total");
    expect(l.remainingLabel).toBe("Faltam");
    expect(l.nextLevelLabel).toBe("Próximo nível");
  });

  it("localizes labels in English", () => {
    const l = buildPlayerLevelLabels("en", progress);
    expect(l.cardLabel).toBe("Player profile");
    expect(l.title).toBe("Level");
    expect(l.badge).toBe("Level 7");
    expect(l.lifetimeLabel).toBe("Lifetime XP");
    expect(l.remainingLabel).toBe("Remaining");
    expect(l.nextLevelLabel).toBe("Next level");
  });

  it("localizes labels in Italian", () => {
    const l = buildPlayerLevelLabels("it", progress);
    expect(l.title).toBe("Livello");
    expect(l.badge).toBe("Livello 7");
    expect(l.remainingLabel).toBe("Mancano");
    expect(l.nextLevelLabel).toBe("Livello successivo");
  });

  it("localizes remaining label in Spanish and French", () => {
    expect(buildPlayerLevelLabels("es", progress).remainingLabel).toBe("Restan");
    expect(buildPlayerLevelLabels("fr", progress).remainingLabel).toBe("Restant");
  });

  it("presents max level state without next-level targets", () => {
    const l = buildPlayerLevelLabels("pt", maxed);
    expect(l.nextTarget).toBe("Nível máximo");
    expect(l.remainingValue).toBe("—");
    expect(l.nextLevelValue).toBe("Nível máximo");
    expect(l.progressLabel).toBe("Nível máximo");
  });

  it("builds an accessible progress-bar label for the next level", () => {
    expect(buildPlayerLevelLabels("en", progress).progressLabel).toBe("Next level: 8");
  });

  it("does not alter XP values or level numbers", () => {
    const l = buildPlayerLevelLabels("en", progress);
    expect(l.currentXPValue).toBe("320 XP");
    expect(l.lifetimeValue).toBe("4820");
    expect(l.remainingValue).toBe("180 XP");
    expect(l.nextTarget).toBe("500 XP");
    expect(l.nextLevelValue).toBe("8");
  });
});
