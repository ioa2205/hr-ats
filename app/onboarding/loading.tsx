import { Skeleton } from "@/components/ui";

export default function OnboardingLoading() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-level-1">
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-20" />
          <Skeleton variant="text" className="h-7 w-3/4" />
          <Skeleton variant="text" className="h-3 w-5/6" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="rect" className="h-[68px] w-full" />
          <Skeleton variant="rect" className="h-11 w-full" />
          <Skeleton variant="rect" className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
