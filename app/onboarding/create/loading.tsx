export default function OnboardingCreateLoading() {
  return (
    <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[8px] border">
      <div className="flex flex-col gap-6 px-7 py-7">
        <div className="flex flex-col gap-2">
          <div className="bg-bone-3 h-3 w-24 animate-pulse rounded" />
          <div className="bg-bone-2 h-7 w-3/4 animate-pulse rounded" />
          <div className="bg-bone-2 h-3 w-5/6 animate-pulse rounded" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <div className="bg-bone-2 h-3 w-28 animate-pulse rounded" />
            <div className="bg-bone-2 h-[44px] w-full animate-pulse rounded-[6px]" />
          </div>
          <div className="space-y-1.5">
            <div className="bg-bone-2 h-3 w-32 animate-pulse rounded" />
            <div className="bg-bone-2 h-[44px] w-full animate-pulse rounded-[6px]" />
          </div>
          <div className="bg-bone-2 h-12 w-full animate-pulse rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}
