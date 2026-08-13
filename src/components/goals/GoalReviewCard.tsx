import type { CreateGoalInput } from "@/services/goals/goalTypes";
import { useGoalsT } from "@/lib/goals-i18n";
import { goalTrackingMode } from "@/services/goals/goalTrackingCapability";
import { categoryLabelKey, formatDate, unitLabelKey } from "./goalPresentation";
import { GoalDifficultyBadge } from "./GoalDifficultyBadge";
import { GoalTrackingBadge } from "./GoalTrackingBadge";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Read-only preview of the goal that is about to be created. It shows the
 * exact input that will be submitted — never internal field names.
 */
export function GoalReviewCard({ input }: { input: CreateGoalInput }) {
  const { tg, locale } = useGoalsT();
  const unit = tg(unitLabelKey(input.unit));
  const mode = goalTrackingMode({ type: input.type, metadata: input.metadata ?? {} });
  const hintKey =
    mode === "auto" ? "gl.autoNote" : mode === "pending" ? "gl.pendingHint" : "gl.manualNote";

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-tight">{input.title}</h3>
        {input.description ? (
          <p className="text-sm text-muted-foreground">{input.description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GoalTrackingBadge goal={{ type: input.type, metadata: input.metadata ?? {} }} />
        <GoalDifficultyBadge difficulty={input.difficulty ?? "medium"} />
      </div>

      <dl>
        <Row label={tg("gl.category")} value={tg(categoryLabelKey(input.category))} />
        <Row
          label={tg("gl.target")}
          value={
            input.progressType === "boolean"
              ? tg("gl.wizard.noTarget")
              : `${input.targetValue}${unit ? ` ${unit}` : ""}`
          }
        />
        <Row
          label={tg("gl.targetDate")}
          value={input.targetDate ? formatDate(input.targetDate, locale) : tg("gl.noDeadline")}
        />
      </dl>

      <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{tg(hintKey)}</p>
    </div>
  );
}
