"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { SHORTCUTS } from "@/lib/operator/shortcuts";
import {
  getIsMacServerSnapshot,
  getIsMacSnapshot,
  subscribePlatform,
} from "@/lib/operator/platform-store";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsCheatsheet({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const mac = useSyncExternalStore(subscribePlatform, getIsMacSnapshot, getIsMacServerSnapshot);

  const groups = useMemo(() => {
    const map = new Map<TranslationKey, typeof SHORTCUTS>();
    for (const s of SHORTCUTS) {
      const arr = map.get(s.groupKey);
      if (arr) (arr as unknown as typeof SHORTCUTS[number][]).push(s);
      else map.set(s.groupKey, [s] as unknown as typeof SHORTCUTS);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("operator.shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("operator.shortcuts.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 p-6 pt-2">
          {groups.map(([groupKey, items]) => (
            <section key={groupKey} className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
                {t(groupKey)}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {(items as unknown as typeof SHORTCUTS[number][]).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
                  >
                    <span>{t(s.labelKey)}</span>
                    <kbd className="font-[var(--font-mono)] rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-2 py-0.5 text-xs tracking-tight text-[var(--color-text-muted)]">
                      {mac ? s.display.mac : s.display.other}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
