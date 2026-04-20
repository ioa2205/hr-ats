import { Skeleton } from "@/components/ui";

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-8 w-32" />
        <Skeleton variant="rect" className="h-10 w-40" />
      </div>
      <Skeleton variant="rect" className="h-10 w-80" />
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-outline-variant flex items-center gap-4 border-b px-4 py-3"
          >
            <Skeleton variant="text" className="h-5 w-48" />
            <Skeleton variant="rect" className="h-5 w-16" />
            <Skeleton variant="text" className="ml-auto h-5 w-8" />
            <Skeleton variant="text" className="h-5 w-8" />
            <Skeleton variant="text" className="h-5 w-8" />
            <Skeleton variant="text" className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
