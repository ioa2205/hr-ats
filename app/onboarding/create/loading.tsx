import { Skeleton } from "@/components/ui";

export default function OnboardingCreateLoading() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-level-1">
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-2">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="text" className="h-7 w-3/4" />
          <Skeleton variant="text" className="h-3 w-5/6" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-28" />
            <Skeleton variant="rect" className="h-11 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-32" />
            <Skeleton variant="rect" className="h-11 w-full" />
          </div>
          <Skeleton variant="rect" className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
