import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "./goalPresentation";

const TONES: Record<BadgeTone, string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  accent: "border-accent/40 bg-accent/10 text-accent",
  muted: "border-border/60 bg-background/40 text-muted-foreground",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Shared badge shell for every Goals chip — one geometry, one radius. */
export function Chip({
  children,
  icon,
  tone = "muted",
  className,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4",
        TONES[tone],
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
