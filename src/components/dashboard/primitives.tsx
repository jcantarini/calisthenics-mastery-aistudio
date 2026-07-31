import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared premium card shell for every dashboard section. */
export function DashCard({
  children,
  className,
  as: Comp = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className={cn(
        "rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Accessible progress bar with a gradient fill. */
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-background/60", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
