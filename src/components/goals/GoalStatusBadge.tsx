import { Ban, CheckCircle2, CircleDashed, Clock, PauseCircle, PlayCircle } from "lucide-react";
import type { GoalStatus } from "@/services/goals";
import { useGoalsT } from "@/lib/goals-i18n";
import { statusLabelKey, statusTone } from "./goalPresentation";
import { Chip } from "./chip";

const ICONS = {
  draft: CircleDashed,
  active: PlayCircle,
  paused: PauseCircle,
  completed: CheckCircle2,
  cancelled: Ban,
  expired: Clock,
} as const;

/** Status is never communicated by colour alone: icon + text + styling. */
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { tg } = useGoalsT();
  const Icon = ICONS[status] ?? CircleDashed;
  return (
    <Chip tone={statusTone(status)} icon={<Icon className="h-3.5 w-3.5" aria-hidden />}>
      {tg(statusLabelKey(status))}
    </Chip>
  );
}
