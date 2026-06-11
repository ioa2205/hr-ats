import { Card, Panel, PanelHeader, Skeleton } from "@/components/ui";

export default function ApplyLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {/* Hero */}
      <Card>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton variant="rect" className="h-11 w-11" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton variant="rect" className="h-9 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="rect" className="h-7 w-36 rounded-[var(--radius-full)]" />
            <Skeleton variant="rect" className="h-7 w-44 rounded-[var(--radius-full)]" />
          </div>
        </div>
      </Card>

      {/* Description */}
      <Panel>
        <PanelHeader>
          <Skeleton className="h-3.5 w-24" />
        </PanelHeader>
        <div className="space-y-3 px-5 py-5 sm:px-6">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-10/12" />
        </div>
      </Panel>

      {/* Form */}
      <Panel>
        <PanelHeader>
          <Skeleton className="h-3.5 w-28" />
        </PanelHeader>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <Skeleton variant="rect" className="h-11 w-full" />
          <Skeleton variant="rect" className="h-11 w-full" />
          <Skeleton variant="rect" className="h-24 w-full" />
          <Skeleton variant="rect" className="h-12 w-full" />
        </div>
      </Panel>
    </div>
  );
}
