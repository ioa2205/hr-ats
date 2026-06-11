export default function OperatorLoading() {
  return (
    <div className="flex flex-col gap-5 font-[var(--font-sans)]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
          <div className="h-6 w-40 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-subtle)]" />
          <div className="h-7 w-32 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-subtle)]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
            <div className="h-5 w-24 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
            <div className="h-6 w-20 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
            <div className="mt-3 h-[120px] w-full animate-pulse rounded bg-[var(--color-surface-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
