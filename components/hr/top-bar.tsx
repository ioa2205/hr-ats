"use client";

import { HRThemeToggle } from "./theme-toggle";
import { HRLocaleSwitcher } from "./hr-locale-switcher";
import { HRAvatarMenu } from "./hr-avatar-menu";
import { NotificationsBell } from "./notifications-bell";

interface Props {
  email: string;
  fullName: string | null;
  notifications: { companyId: string; userId: string } | null;
}

export function HRTopBar({ email, fullName, notifications }: Props) {
  return (
    <header
      data-testid="hr-top-bar"
      className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-bone)]/90 px-4 backdrop-blur-sm"
    >
      <div className="flex flex-1 items-center" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {notifications && (
          <>
            <NotificationsBell
              companyId={notifications.companyId}
              userId={notifications.userId}
            />
            <span className="h-4 w-px bg-[var(--color-rule-2)]" aria-hidden="true" />
          </>
        )}
        <HRLocaleSwitcher />
        <HRThemeToggle />
        <HRAvatarMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
