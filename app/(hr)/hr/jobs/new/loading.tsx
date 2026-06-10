import { Skeleton } from "@/components/ui";

export default function NewJobLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" className="h-3 w-20" />
        <Skeleton variant="text" className="h-8 w-56" />
        <Skeleton variant="text" className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton variant="rect" className="h-40 w-full" />
      <Skeleton variant="rect" className="h-28 w-full" />
      <Skeleton variant="rect" className="h-56 w-full" />
      <Skeleton variant="rect" className="h-24 w-full" />
    </div>
  );
}
