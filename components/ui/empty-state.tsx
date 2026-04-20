import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4 py-16 text-center", className)}
    >
      <div className="text-on-surface-variant [&>svg]:h-16 [&>svg]:w-16">{icon}</div>
      <div className="flex flex-col gap-1">
        <h3 className="text-on-surface text-lg font-medium">{title}</h3>
        {description && <p className="text-on-surface-variant max-w-sm text-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
