export default function OnboardingLoading() {
  return (
    <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[8px] border">
      <div className="flex flex-col gap-6 px-7 py-7">
        <div className="flex flex-col gap-2">
          <div className="bg-bone-3 h-3 w-20 animate-pulse rounded" />
          <div className="bg-bone-2 h-7 w-3/4 animate-pulse rounded" />
          <div className="bg-bone-2 h-3 w-5/6 animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="bg-bone-2 h-[68px] w-full animate-pulse rounded-[6px]" />
          <div className="bg-bone-2 h-[44px] w-full animate-pulse rounded-[6px]" />
          <div className="bg-bone-2 h-[44px] w-full animate-pulse rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}
