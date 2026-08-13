import { Hand, Radio } from "lucide-react";
import type { Goal } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { trackingMode } from "./goalPresentation";
import { Chip } from "./chip";

/** Tells the user, in plain language, who moves this goal forward. */
export function GoalTrackingBadge({ goal }: { goal: Pick<Goal, "type"> }) {
  const { tg } = useGoalsT();
  const mode = trackingMode(goal);
  const auto = mode === "auto";
  return (
    <Chip
      tone={auto ? "primary" : "muted"}
      title={tg(auto ? "gl.autoHint" : "gl.manualHint")}
      icon={
        auto ? <Radio className="h-3.5 w-3.5" aria-hidden /> : <Hand className="h-3.5 w-3.5" aria-hidden />
      }
    >
      <span className="sr-only">{tg("gl.tracking")}: </span>
      {tg(auto ? "gl.auto" : "gl.manual")}
    </Chip>
  );
}
