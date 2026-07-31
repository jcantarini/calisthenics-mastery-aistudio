import { Skeleton } from "@/components/ui/skeleton";
import { DashCard } from "./primitives";

/** Layout-matched skeletons — same card rhythm as the real dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando painel…</span>
      <DashCard>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-48" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-full" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
        <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-40" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-28" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </DashCard>
    </div>
  );
}
