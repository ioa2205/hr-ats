import { Skeleton } from "@/components/ui";

export default function OnboardingLoading() {
  return (
    <div className="account-panel" aria-busy="true" aria-label="Loading onboarding">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-20" />
          <Skeleton variant="text" className="h-10 w-3/4" />
          <Skeleton variant="text" className="h-3 w-5/6" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="rect" className="h-[82px] w-full rounded-[16px]" />
          <Skeleton variant="rect" className="h-[52px] w-full rounded-[12px]" />
          <Skeleton variant="rect" className="h-[52px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
