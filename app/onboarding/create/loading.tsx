import { Skeleton } from "@/components/ui";

export default function OnboardingCreateLoading() {
  return (
    <div className="account-panel" aria-busy="true" aria-label="Loading company form">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="text" className="h-10 w-3/4" />
          <Skeleton variant="text" className="h-3 w-5/6" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-28" />
            <Skeleton variant="rect" className="h-[52px] w-full rounded-[12px]" />
          </div>
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-32" />
            <Skeleton variant="rect" className="h-[52px] w-full rounded-[12px]" />
          </div>
          <Skeleton variant="rect" className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
