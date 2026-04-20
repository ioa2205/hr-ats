export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-bone-3/60 h-3 w-24 animate-pulse rounded-[3px]" />
        <div className="bg-bone-3/60 h-7 w-48 animate-pulse rounded-[4px]" />
        <div className="bg-bone-3/60 h-3 w-[340px] animate-pulse rounded-[3px]" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="hidden w-[240px] shrink-0 space-y-2 lg:block">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-bone-3/60 h-8 w-full animate-pulse rounded-[4px]"
            />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="bg-bone-3/60 h-3 w-40 animate-pulse rounded-[3px]" />
          <div className="border-rule bg-paper shadow-tez-1 space-y-3 rounded-[6px] border p-5">
            <div className="bg-bone-3/60 h-4 w-32 animate-pulse rounded-[3px]" />
            <div className="bg-bone-3/60 h-10 w-full animate-pulse rounded-[4px]" />
            <div className="bg-bone-3/60 h-10 w-full animate-pulse rounded-[4px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
