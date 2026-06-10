"use client";

import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { signOut } from "@/lib/actions/auth";

interface Props {
  email: string;
  fullName: string | null;
}

export function HRAvatarMenu({ email, fullName }: Props) {
  const { t } = useTranslation();
  const initials = initialsOf(fullName ?? email);
  const name = fullName ?? email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("operator.chrome.account")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[11px] font-semibold text-[var(--color-on-primary-container)] hover:bg-[color-mix(in_srgb,var(--color-primary-container)_88%,var(--color-text))]"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--color-text)]">{name}</span>
            {fullName && (
              <span className="text-[11px] text-[var(--color-text-muted)]">{email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{t("auth.sign_out")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initialsOf(s: string): string {
  const parts = s.split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(1, "?");
}
