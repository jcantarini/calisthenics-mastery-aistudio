import { Skeleton } from "@/components/ui/skeleton";
import { DashCard } from "./primitives";

/**
 * Layout-matched skeletons — identical card rhythm, radii and paddings as the
 * real dashboard so nothing shifts when data lands.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando painel…</span>

      <DashCard>
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="mt-3 h-8 w-56 rounded-xl" />
        <Skeleton className="mt-2 h-4 w-full max-w-sm rounded-lg" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Skeleton className="h-[74px] rounded-2xl" />
          <Skeleton className="h-[74px] rounded-2xl" />
          <Skeleton className="h-[74px] rounded-2xl" />
        </div>
        <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="mt-3 h-6 w-48 rounded-xl" />
        <Skeleton className="mt-2 h-3 w-40 rounded-lg" />
        <Skeleton className="mt-5 h-2 w-full rounded-full" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-2xl" />
          ))}
        </div>
      </DashCard>

      <DashCard>
        <Skeleton className="h-3 w-28 rounded-full" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </DashCard>
    </div>
  );
}
