import { Hand, Hourglass, Radio } from "lucide-react";
// Direct domain imports: the Goals public barrel has a registration side effect
// (registerGoalGamification) and re-exporting tracking capability through it
// breaks the production chunk graph. See Sprint 7.4A-3.
import { goalTrackingMode, type GoalTrackingMode } from "@/services/goals/goalTrackingCapability";
import type { Goal } from "@/services/goals/goalTypes";
import { useGoalsT } from "@/lib/goals-i18n";
import type { BadgeTone } from "./goalPresentation";
import { Chip } from "./chip";

const META: Record<GoalTrackingMode, { icon: typeof Hand; tone: BadgeTone; label: string }> = {
  auto: { icon: Radio, tone: "primary", label: "gl.auto" },
  manual: { icon: Hand, tone: "muted", label: "gl.manual" },
  pending: { icon: Hourglass, tone: "warning", label: "gl.pending" },
};

/**
 * Tells the user, in plain language, who moves this goal forward. The mode
 * comes from the Goals domain, so the label is always truthful.
 */
export function GoalTrackingBadge({ goal }: { goal: Pick<Goal, "type" | "metadata"> }) {
  const { tg } = useGoalsT();
  const mode = goalTrackingMode(goal);
  const meta = META[mode];
  const Icon = meta.icon;
  return (
    <Chip tone={meta.tone} icon={<Icon className="h-3.5 w-3.5" aria-hidden />}>
      <span className="sr-only">{tg("gl.tracking")}: </span>
      {tg(meta.label)}
    </Chip>
  );
}
