import { memo, type ReactNode } from "react";
import { ProgressBar } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

/** Shared labelled bar shell: title on the left, value on the right. */
function LabelledBar({
  label,
  value,
  right,
  className,
  tone,
}: {
  label: string;
  value: number;
  right?: ReactNode;
  className?: string;
  tone?: "primary" | "accent";
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {right ? (
          <span className="shrink-0 tabular-nums text-muted-foreground">{right}</span>
        ) : null}
      </div>
      <ProgressBar
        value={value}
        label={label}
        className={tone === "accent" ? "bg-accent/10" : undefined}
      />
    </div>
  );
}

/** XP progress towards the next level. */
export const XPProgressBar = memo(function XPProgressBar({
  percentage,
  currentXP,
  nextLevelXP,
  isMaxLevel = false,
  label,
  maxLabel,
}: {
  percentage: number;
  currentXP: number;
  nextLevelXP: number;
  isMaxLevel?: boolean;
  label: string;
  maxLabel: string;
}) {
  return (
    <LabelledBar
      label={label}
      value={isMaxLevel ? 100 : percentage}
      right={isMaxLevel ? maxLabel : `${currentXP} / ${nextLevelXP} XP`}
    />
  );
});

/** Weekly training progress. */
export const WeeklyProgressBar = memo(function WeeklyProgressBar({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return <LabelledBar label={label} value={pct} right={`${completed}/${total}`} />;
});

/** Program completion progress. */
export const ProgramProgressBar = memo(function ProgramProgressBar({
  percentage,
  label,
}: {
  percentage: number;
  label: string;
}) {
  return <LabelledBar label={label} value={percentage} right={`${Math.round(percentage)}%`} />;
});

/** Achievement progress towards its target. */
export const AchievementProgressBar = memo(function AchievementProgressBar({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label: string;
}) {
  const pct = target > 0 ? (current / target) * 100 : 0;
  return <LabelledBar label={label} value={pct} right={`${current}/${target}`} />;
});

/** Goal progress — reserved for the future Goals engine. */
export const GoalProgressBar = memo(function GoalProgressBar({
  percentage,
  label,
  right,
}: {
  percentage: number;
  label: string;
  right?: string;
}) {
  return <LabelledBar label={label} value={percentage} right={right} tone="accent" />;
});
