import { Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Skeleton variant="text" className="h-3 w-40" />
        <Skeleton variant="text" className="h-8 w-72" />
        <Skeleton variant="text" className="h-4 w-96 max-w-full" />
      </div>

      {/* Queue cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-[92px] w-full" />
        ))}
      </div>

      {/* Active jobs + top picks */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <Skeleton variant="text" className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <Skeleton variant="text" className="mb-4 h-5 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="flex flex-col gap-3">
        <Skeleton variant="text" className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-[72px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
