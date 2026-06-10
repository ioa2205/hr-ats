import { Skeleton } from "@/components/ui";

export default function JobDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton variant="text" className="h-3 w-40" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton variant="rect" className="h-10 w-24" />
          <Skeleton variant="rect" className="h-10 w-28" />
          <Skeleton variant="rect" className="h-10 w-32" />
        </div>
      </div>
      <Skeleton variant="rect" className="h-10 w-full max-w-md" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-[72px] w-full" />
            ))}
          </div>
          <Skeleton variant="rect" className="h-48 w-full" />
          <Skeleton variant="rect" className="h-32 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton variant="rect" className="h-24 w-full" />
          <Skeleton variant="rect" className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
