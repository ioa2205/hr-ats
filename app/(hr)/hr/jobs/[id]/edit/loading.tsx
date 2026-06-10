import { Skeleton } from "@/components/ui";

export default function EditJobLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" className="h-3 w-32" />
        <Skeleton variant="text" className="h-8 w-48" />
      </div>
      <Skeleton variant="rect" className="h-40 w-full" />
      <Skeleton variant="rect" className="h-28 w-full" />
      <Skeleton variant="rect" className="h-56 w-full" />
      <Skeleton variant="rect" className="h-24 w-full" />
    </div>
  );
}
