import { Skeleton } from "@/components/ui";

export default function SourcingHubLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-3 w-20" />
        <Skeleton variant="text" className="h-7 w-44" />
        <Skeleton variant="text" className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton variant="rect" className="h-72 w-full" />
    </div>
  );
}
