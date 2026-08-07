import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Layout-matched skeleton presets. Each mirrors its target component's
 * geometry so swapping to real content produces zero CLS.
 */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-3xl border border-border/60 bg-surface p-5 shadow-card", className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <ListItemSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-surface p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-14" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="px-5 pt-12" aria-hidden>
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </header>
      <div className="mt-6">
        <CardSkeleton />
      </div>
      <div className="mt-6">
        <HeroSkeleton />
      </div>
      <div className="mt-6">
        <StatGridSkeleton />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-32" />
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="px-5 pt-12" aria-hidden>
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="px-5 pt-12" aria-hidden>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
