"use client";

import { Check } from "lucide-react";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

interface Slot {
  id: string;
  start_at: string;
  position: number;
}

interface SlotPickerProps {
  slots: Slot[];
  durationMinutes: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  locale: Locale;
  disabled?: boolean;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDay(d: Date, locale: Locale): string {
  return d.toLocaleDateString(locale === "uz" ? "ru" : locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTimeRange(start: Date, durationMin: number): string {
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${pad2(start.getHours())}:${pad2(start.getMinutes())} – ${pad2(
    end.getHours(),
  )}:${pad2(end.getMinutes())}`;
}

export function SlotPicker({
  slots,
  durationMinutes,
  selectedId,
  onSelect,
  locale,
  disabled,
}: SlotPickerProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" role="radiogroup">
      {slots.map((slot) => {
        const start = new Date(slot.start_at);
        const selected = slot.id === selectedId;
        return (
          <li key={slot.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onSelect(slot.id)}
              className={cn(
                "border-rule bg-paper hover:border-ink-6 group flex w-full items-center justify-between gap-3 rounded-[8px] border px-4 py-3.5 text-left transition-colors",
                selected && "border-ink bg-bone-2/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-ink text-[18px] font-semibold leading-[1.2] tracking-[-0.015em]">
                  {formatDay(start, locale)}
                </div>
                <div
                  className="text-ink-3 mt-1 text-[13.5px]"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {formatTimeRange(start, durationMinutes)}
                </div>
              </div>
              <span
                aria-hidden
                className={cn(
                  "border-rule-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                  selected ? "bg-ink border-ink" : "bg-paper",
                )}
              >
                {selected && <Check className="text-paper h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
