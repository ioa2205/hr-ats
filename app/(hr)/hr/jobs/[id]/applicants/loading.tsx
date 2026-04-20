import { Skeleton } from "@/components/ui";

export default function ApplicantsLoading() {
  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header skeleton */}
      <div className="shrink-0 space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" variant="rect" />
          ))}
        </div>
      </div>

      {/* Split view skeleton */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel */}
        <div className="border-outline-variant w-[400px] shrink-0 space-y-1 border-r p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex h-14 items-center gap-3 px-4">
              <Skeleton className="h-4 w-6" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
