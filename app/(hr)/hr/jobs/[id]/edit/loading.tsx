import { Skeleton } from "@/components/ui";

export default function EditJobLoading() {
  return (
    <div className="space-y-6">
      <Skeleton variant="text" className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-10 w-full" />
        <Skeleton variant="rect" className="h-32 w-full" />
        <Skeleton variant="rect" className="h-10 w-full" />
        <Skeleton variant="rect" className="h-20 w-full" />
      </div>
    </div>
  );
}
