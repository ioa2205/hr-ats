import { Skeleton } from "@/components/ui";

export default function SourcingRunsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-7 w-56" />
          <Skeleton variant="text" className="h-4 w-80" />
        </div>
        <Skeleton variant="rect" className="h-10 w-36" />
      </div>
      <Skeleton variant="rect" className="h-64 w-full" />
    </div>
  );
}
