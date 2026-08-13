import type { GoalCategory } from "@/services/goals/goalTypes";
import { useGoalsT } from "@/lib/goals-i18n";
import { cn } from "@/lib/utils";
import { categoryIcon, categoryLabelKey } from "./goalPresentation";
import type { RadioOptionProps } from "./GoalRadioGroup";

/** Selectable category card. Selection is announced, never colour-only. */
export function GoalCategoryCard({
  category,
  selected,
  radioProps,
}: {
  category: GoalCategory;
  selected: boolean;
  radioProps: RadioOptionProps;
}) {
  const { tg } = useGoalsT();
  const Icon = categoryIcon(category);
  return (
    <button
      type="button"
      {...radioProps}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10"
          : "border-border/60 bg-card/40 hover:border-primary/50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          selected ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{tg(categoryLabelKey(category))}</span>
        <span className="block text-xs text-muted-foreground">{tg(`gl.catDesc.${category}`)}</span>
      </span>
    </button>
  );
}
