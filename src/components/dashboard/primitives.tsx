import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Shared premium card shell for every dashboard section. */
export function DashCard({
  children,
  className,
  as: Comp = "section",
  interactive = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "header" | "article";
  /** Enables the desktop hover lift. Use for cards that lead somewhere. */
  interactive?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className={cn(
        "rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card sm:p-6",
        interactive && "card-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Consistent eyebrow header used at the top of every card. */
export function SectionTitle({
  children,
  action,
  icon,
  stack = false,
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** Stacks title and action on narrow screens and lets the title wrap. */
  stack?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-6 gap-3",
        stack
          ? "flex-col items-start sm:flex-row sm:items-center sm:justify-between"
          : "items-center justify-between",
      )}
    >
      <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        <span className={stack ? "min-w-0 break-words" : "truncate"}>{children}</span>
      </h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Rounded icon tile — one size, one radius, used by every card header. */
export function CardIcon({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "accent" | "muted";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "muted" && "bg-background/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Accessible progress bar with an animated gradient fill. */
export const ProgressBar = memo(function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
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
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
});

export function Pill({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "primary" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium leading-5",
        tone === "default" && "border-border/60 bg-background/40 text-foreground",
        tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
        tone === "accent" && "border-accent/40 bg-accent/10 text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status chip with the same rhythm as Pill, used in card headers. */
export function StatusBadge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

type ActionVariant = "primary" | "outline" | "ghost";

const ACTION_BASE =
  "press tap inline-flex items-center justify-center gap-2 font-semibold disabled:pointer-events-none disabled:opacity-50";

const ACTION_VARIANT: Record<ActionVariant, string> = {
  primary:
    "rounded-2xl bg-primary text-primary-foreground shadow-glow hover:brightness-110 min-h-13 px-5 text-sm",
  outline:
    "rounded-full border border-border bg-surface hover:border-primary/40 min-h-11 px-4 text-xs",
  ghost: "rounded-full text-muted-foreground hover:text-foreground min-h-11 px-3 text-xs",
};

export function actionClasses(variant: ActionVariant = "outline", className?: string) {
  return cn(ACTION_BASE, ACTION_VARIANT[variant], className);
}

/** Button sharing the exact geometry of the link variant (actionClasses). */
export function ActionButton({
  children,
  variant = "outline",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: ActionVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={actionClasses(variant, className)} {...rest}>
      {children}
    </button>
  );
}

/** Compact metric tile shared by statistics / weekly / today cards. */
export function StatTile({
  label,
  value,
  icon,
  as = "div",
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  /** "dl" renders dt/dd for definition lists. */
  as?: "div" | "dl";
}) {
  const Label = as === "dl" ? "dt" : "p";
  const Value = as === "dl" ? "dd" : "p";
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start gap-1.5 text-muted-foreground">
        {icon ? <span className="mt-px shrink-0">{icon}</span> : null}
        <Label className="min-w-0 break-words text-[10px] font-semibold uppercase leading-tight tracking-widest">
          {label}
        </Label>
      </div>

      <Value className="mt-1.5 text-display text-xl leading-none tabular-nums">{value}</Value>
    </div>
  );
}
