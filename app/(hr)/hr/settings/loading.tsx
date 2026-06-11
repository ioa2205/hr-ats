import { Skeleton } from "@/components/ui";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-3 w-24" />
        <Skeleton variant="text" className="h-7 w-48" />
        <Skeleton variant="text" className="h-3 w-[340px] max-w-full" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="hidden w-[240px] shrink-0 space-y-2 lg:block">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rect" className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton variant="text" className="h-3 w-40" />
          <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="rect" className="h-10 w-full" />
            <Skeleton variant="rect" className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
