import { Skeleton } from "@/components/ui";

export default function TeamLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton variant="text" className="h-7 w-20" />
        <Skeleton variant="text" className="h-4 w-72" />
      </div>

      {/* Invite form skeleton */}
      <div className="space-y-3">
        <Skeleton variant="text" className="h-5 w-36" />
        <Skeleton variant="text" className="h-4 w-56" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton variant="rect" className="h-10 flex-1" />
          <Skeleton variant="rect" className="h-10 w-40" />
          <Skeleton variant="rect" className="h-10 w-32" />
        </div>
      </div>

      {/* Members list skeleton */}
      <div className="space-y-3">
        <Skeleton variant="text" className="h-5 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton variant="circle" className="h-9 w-9" />
            <div className="flex-1 space-y-1">
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="text" className="h-3 w-44" />
            </div>
            <Skeleton variant="rect" className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
