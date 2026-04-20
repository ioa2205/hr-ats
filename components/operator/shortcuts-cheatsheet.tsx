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
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[var(--color-ink-4)] uppercase">
                {t(groupKey)}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {(items as unknown as typeof SHORTCUTS[number][]).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-bone-2)]"
                  >
                    <span>{t(s.labelKey)}</span>
                    <kbd className="font-[var(--font-tez-mono)] rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2 py-0.5 text-xs tracking-tight text-[var(--color-ink-3)]">
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
