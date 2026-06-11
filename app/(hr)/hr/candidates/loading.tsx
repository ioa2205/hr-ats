import { Skeleton } from "@/components/ui";

export default function CandidatesLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header + search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-44" />
          <Skeleton variant="text" className="h-8 w-40" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
          <Skeleton variant="rect" className="h-10 w-full sm:w-[240px]" />
          <Skeleton variant="rect" className="h-10 w-full sm:w-32" />
          <Skeleton variant="rect" className="h-10 w-full sm:w-32" />
          <Skeleton variant="rect" className="h-10 w-full sm:w-24" />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-8 w-20 shrink-0 rounded-[var(--radius-full)]" />
        ))}
      </div>

      {/* Candidate list */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--color-line)] px-4 py-3 last:border-0"
          >
            <Skeleton variant="circle" width={36} height={36} className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton variant="text" className="h-4 w-40" />
              <Skeleton variant="text" className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton variant="rect" className="hidden h-5 w-24 sm:block" />
            <Skeleton variant="rect" className="hidden h-5 w-20 sm:block" />
            <Skeleton variant="rect" className="h-9 w-9 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
