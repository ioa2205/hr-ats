import { Skeleton } from "@/components/ui";

export default function JobDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rect" className="h-10 w-28" />
          <Skeleton variant="rect" className="h-10 w-36" />
          <Skeleton variant="rect" className="h-10 w-24" />
        </div>
      </div>
      <Skeleton variant="rect" className="h-5 w-24" />
      <Skeleton variant="rect" className="h-48 w-full" />
      <Skeleton variant="rect" className="h-32 w-full" />
    </div>
  );
}
