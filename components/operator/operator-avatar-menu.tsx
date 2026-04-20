"use client";

import { LogOut, Keyboard, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useOperatorChrome } from "./operator-chrome-context";
import { useTranslation } from "@/lib/i18n/provider";
import { signOut } from "@/lib/actions/auth";

interface Props {
  email: string;
  fullName: string | null;
}

export function OperatorAvatarMenu({ email, fullName }: Props) {
  const { setCheatsheetOpen } = useOperatorChrome();
  const { t } = useTranslation();
  const initials = initialsOf(fullName ?? email);
  const name = fullName ?? email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("operator.chrome.account")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-persimmon-tint)] text-[11px] font-semibold text-[var(--color-persimmon-2)] hover:bg-[var(--color-persimmon-tint-2)]"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--color-ink)]">{name}</span>
            {fullName && (
              <span className="text-[11px] text-[var(--color-ink-4)]">{email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setCheatsheetOpen(true)}>
          <Keyboard className="h-3.5 w-3.5" />
          <span className="flex-1">{t("operator.chrome.shortcuts")}</span>
          <kbd className="font-[var(--font-tez-mono)] text-[10px] text-[var(--color-ink-5)]">?</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/hr/dashboard" className="flex w-full items-center gap-2">
            <User className="h-3.5 w-3.5" />
            <span>{t("admin.hr_portal")}</span>
          </a>
        </DropdownMenuItem>
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
