import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Trophy, Zap } from "lucide-react";
import { usePlayerStats, usePlayerProgress } from "@/hooks/usePlayerProgression";
import { useCurrentProgram } from "@/hooks/useTrainingProgram";
import { useAppState } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { tG } from "@/lib/gamification-i18n";
import { FadeIn } from "@/components/ui/motion";
import { PlayerStatsCard } from "@/components/gamification/PlayerStatsCard";
import { RecentAchievementsCard } from "@/components/dashboard/RecentAchievementsCard";
import { actionClasses } from "@/components/dashboard/primitives";

export const Route = createFileRoute("/_authenticated/jogador")({
  head: () => ({
    meta: [
      { title: "Perfil do jogador — Nível, XP e conquistas | Barra" },
      {
        name: "description",
        content:
          "Veja seu nível, XP total, sequência, conquistas, programas concluídos e tempo de treino no perfil de jogador do Barra.",
      },
      { property: "og:title", content: "Perfil do jogador — Nível, XP e conquistas | Barra" },
      {
        property: "og:description",
        content: "Nível, XP, sequência e conquistas do seu progresso em calistenia.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { locale } = useT();
  const { data: stats, loading } = usePlayerStats();
  const { data: snapshot } = usePlayerProgress();
  const { data: program } = useCurrentProgram();
  const [app] = useAppState();

  // Presentation-only aggregation of locally logged sessions.
  const { workouts, minutes, kcal } = useMemo(() => {
    let sec = 0;
    let cal = 0;
    let count = 0;
    for (const list of Object.values(app.workoutLog)) {
      for (const s of list) {
        sec += s.durationSec;
        cal += s.kcalBurned;
        count += 1;
      }
    }
    return { workouts: count, minutes: Math.round(sec / 60), kcal: Math.round(cal) };
  }, [app.workoutLog]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-10 sm:px-6 sm:pt-12">
      <h1 className="text-display text-2xl">{tG(locale, "g.playerProfile")}</h1>

      {loading || !stats ? (
        <div className="h-72 animate-pulse rounded-3xl bg-muted/40" />
      ) : (
        <FadeIn>
          <PlayerStatsCard
            stats={stats}
            nextLevelXP={snapshot?.nextLevelXP ?? stats.currentXP}
            isMaxLevel={snapshot?.isMaxLevel ?? false}
            name={app.profile.name || undefined}
            workoutsCompleted={program?.plan.completedWorkouts ?? workouts}
            trainingMinutes={minutes}
            caloriesBurned={kcal}
            currentGoal={program?.plan.primaryGoal ?? null}
            currentProgram={program?.plan.programTitle ?? null}
          />
        </FadeIn>
      )}

      <FadeIn>
        <RecentAchievementsCard />
      </FadeIn>

      <nav className="grid gap-2 sm:grid-cols-3" aria-label={tG(locale, "g.player")}>
        <Link to="/conquistas" className={actionClasses("outline")}>
          <Trophy className="h-4 w-4" aria-hidden />
          {tG(locale, "g.achievements")}
        </Link>
        <Link to="/xp" className={actionClasses("outline")}>
          <Zap className="h-4 w-4" aria-hidden />
          {tG(locale, "g.xpHistory")}
        </Link>
        <Link to="/niveis" className={actionClasses("outline")}>
          <History className="h-4 w-4" aria-hidden />
          {tG(locale, "g.levelHistory")}
        </Link>
      </nav>
    </main>
  );
}
