import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import { GOAL_FILTERS, filterLabelKey, type GoalFilter } from "./goalPresentation";

/**
 * Mobile-first status filters. Purely presentational: filtering happens on
 * the already-loaded goals, never with a new request.
 */
export function GoalsFilters({
  value,
  onChange,
  counts,
}: {
  value: GoalFilter;
  onChange: (filter: GoalFilter) => void;
  counts?: Record<GoalFilter, number>;
}) {
  const { tg } = useGoalsT();

  return (
    <div
      role="tablist"
      aria-label={tg("gl.filters")}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {GOAL_FILTERS.map((filter) => {
        const selected = filter === value;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(filter)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-surface-elevated text-muted-foreground",
            )}
          >
            {tg(filterLabelKey(filter))}
            {counts ? (
              <span className="tabular-nums opacity-80">{counts[filter]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
