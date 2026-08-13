import { Hand, Hourglass, Radio } from "lucide-react";
import { goalTrackingMode, type Goal, type GoalTrackingMode } from "@/services/goals";
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

/** Sentence version used in Goal Details, where there is room to explain. */
export function goalTrackingHintKey(goal: Pick<Goal, "type" | "metadata">): string {
  const mode = goalTrackingMode(goal);
  if (mode === "auto") return "gl.autoNote";
  if (mode === "pending") return "gl.pendingHint";
  return "gl.manualNote";
}
