import type { ReactNode } from "react";

export function SettingsHeader({
  title,
  sub,
}: {
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="border-rule mb-6 border-b pb-4">
      <h2 className="text-ink m-0 text-[22px] font-semibold leading-[1.15] tracking-[-0.018em]">
        {title}
      </h2>
      {sub && <p className="text-ink-4 mt-2 text-[13px]">{sub}</p>}
    </div>
  );
}
