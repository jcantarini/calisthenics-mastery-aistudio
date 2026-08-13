import { Check } from "lucide-react";
import { goalTrackingMode } from "@/services/goals/goalTrackingCapability";
import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import type { GoalTemplate } from "./goalTemplates";
import { GoalTrackingBadge } from "./GoalTrackingBadge";

/** Selectable goal template. The tracking badge always tells the truth. */
export function GoalTemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: GoalTemplate;
  selected: boolean;
  onSelect: (template: GoalTemplate) => void;
}) {
  const { tg } = useGoalsT();
  // Truthful preview: derived from the canonical capability selector.
  void goalTrackingMode({ type: template.type, metadata: template.metadata });
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(template)}
      className={cn(
        "flex w-full min-h-11 items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10"
          : "border-border/60 bg-card/40 hover:border-primary/50",
      )}
    >
      <span className="min-w-0 space-y-1.5">
        <span className="block text-sm font-semibold">{tg(`gl.t.${template.id}.name`)}</span>
        <span className="block text-xs text-muted-foreground">
          {tg(`gl.t.${template.id}.desc`)}
        </span>
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          <GoalTrackingBadge goal={{ type: template.type, metadata: template.metadata }} />
        </span>
      </span>
      {selected ? <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}
