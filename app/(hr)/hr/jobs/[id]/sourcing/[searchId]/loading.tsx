import { Skeleton } from "@/components/ui";

export default function SourcingResultsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-7 w-56" />
          <Skeleton variant="text" className="h-4 w-80" />
        </div>
        <Skeleton variant="rect" className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rect" className="h-16 w-full" />
        ))}
      </div>
      <Skeleton variant="rect" className="h-64 w-full" />
    </div>
  );
}
