import { CheckCircle2, Flame, Target } from "lucide-react";
import { useGoalsT } from "@/lib/goals-i18n";
import { DashCard } from "@/components/dashboard/primitives";
import type { GoalsSummaryData } from "./goalPresentation";

function Tile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Counts and average come pre-computed from canonical domain values. */
export function GoalsSummary({ summary }: { summary: GoalsSummaryData }) {
  const { tg } = useGoalsT();
  return (
    <DashCard aria-label={tg("gl.summary")} className="p-4">
      <div className="flex items-start gap-2">
        <Tile
          icon={<Target className="h-4 w-4" aria-hidden />}
          value={String(summary.active)}
          label={tg("gl.activeCount")}
        />
        <Tile
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          value={String(summary.completed)}
          label={tg("gl.completedCount")}
        />
        {summary.averageProgress !== null ? (
          <Tile
            icon={<Flame className="h-4 w-4" aria-hidden />}
            value={`${summary.averageProgress}%`}
            label={tg("gl.avgProgress")}
          />
        ) : null}
      </div>
    </DashCard>
  );
}
