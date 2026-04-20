import { Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton variant="text" className="h-8 w-56" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-outline-variant bg-surface rounded-[var(--radius-lg)] border p-6"
          >
            <div className="flex items-start gap-4">
              <Skeleton variant="rect" className="h-12 w-12" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-10 w-16" />
                <Skeleton variant="text" className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton variant="text" className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
