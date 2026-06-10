import { Skeleton } from "@/components/ui";

export default function JobsLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-40" />
          <Skeleton variant="text" className="h-8 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rect" className="h-10 w-full sm:w-[260px]" />
          <Skeleton variant="rect" className="h-10 w-28 shrink-0" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-8 w-16 rounded-[var(--radius-full)]" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-7 w-44" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--color-line)] px-4 py-3 last:border-0"
          >
            <Skeleton variant="rect" className="h-7 w-7 shrink-0" />
            <Skeleton variant="text" className="h-5 w-48" />
            <Skeleton variant="rect" className="h-5 w-16" />
            <Skeleton variant="text" className="ml-auto h-5 w-8" />
            <Skeleton variant="text" className="h-5 w-8" />
            <Skeleton variant="text" className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
