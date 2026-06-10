import { Skeleton } from "@/components/ui";

export default function ActivityLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-3 w-44" />
        <Skeleton variant="text" className="h-8 w-40" />
      </div>
      <Skeleton variant="rect" className="h-96 w-full" />
    </div>
  );
}
