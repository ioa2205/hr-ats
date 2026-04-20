export default function ApplyLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[6px] border">
        <div className="px-6 pb-7 pt-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="bg-bone-2 h-10 w-10 animate-pulse rounded-[5px]" />
            <div className="space-y-1.5">
              <div className="bg-bone-2 h-3 w-28 animate-pulse rounded" />
              <div className="bg-bone-3 h-2 w-16 animate-pulse rounded" />
            </div>
          </div>
          <div className="bg-bone-2 mb-3 h-9 w-3/4 animate-pulse rounded" />
          <div className="bg-bone-2 h-3 w-5/6 animate-pulse rounded" />
        </div>
      </div>
      <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[6px] border">
        <div className="border-rule h-10 border-b" />
        <div className="space-y-3 px-6 py-5">
          <div className="bg-bone-2 h-3 w-full animate-pulse rounded" />
          <div className="bg-bone-2 h-3 w-11/12 animate-pulse rounded" />
          <div className="bg-bone-2 h-3 w-10/12 animate-pulse rounded" />
        </div>
      </div>
      <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[6px] border">
        <div className="border-rule h-10 border-b" />
        <div className="space-y-4 px-6 py-5">
          <div className="bg-bone-2 h-10 w-full animate-pulse rounded-[5px]" />
          <div className="bg-bone-2 h-10 w-full animate-pulse rounded-[5px]" />
          <div className="bg-bone-2 h-24 w-full animate-pulse rounded-[5px]" />
          <div className="bg-bone-3 h-11 w-full animate-pulse rounded-[5px]" />
        </div>
      </div>
    </div>
  );
}
