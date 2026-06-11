import { Card, Panel, PanelHeader, Skeleton } from "@/components/ui";

export default function InterviewLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Card>
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton variant="rect" className="h-11 w-11" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-2 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton variant="rect" className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>
      <Panel>
        <PanelHeader>
          <Skeleton className="h-3.5 w-32" />
        </PanelHeader>
        <div className="flex flex-col gap-2.5 px-5 py-5 sm:px-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rect" className="h-[72px]" />
          ))}
        </div>
      </Panel>
    </div>
  );
}
