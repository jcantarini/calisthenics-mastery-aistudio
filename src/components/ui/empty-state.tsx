import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent empty-state block: icon in a rounded halo, title, description,
 * optional primary action. Use whenever a list, log, or feed has nothing yet.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-surface/40 px-6 py-10 text-center animate-fade-in",
        className,
      )}
    >
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
