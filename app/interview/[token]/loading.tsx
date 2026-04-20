import { Panel } from "@/components/hr/design";

export default function InterviewLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <div className="bg-bone-2 h-10 w-40 animate-pulse rounded-[5px]" />
          <div className="bg-bone-2 h-7 w-3/4 animate-pulse rounded-[5px]" />
          <div className="bg-bone-2/70 h-4 w-1/2 animate-pulse rounded-[4px]" />
        </div>
      </Panel>
      <Panel>
        <div className="flex flex-col gap-2.5 px-5 py-5 sm:px-6">
          <div className="bg-bone-2 h-5 w-32 animate-pulse rounded-[4px]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-bone-2/70 h-[78px] animate-pulse rounded-[8px]" />
          ))}
        </div>
      </Panel>
    </div>
  );
}
