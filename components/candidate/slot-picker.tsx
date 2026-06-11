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
    <div className="flex flex-col gap-2" role="radiogroup">
      {slots.map((slot) => {
        const start = new Date(slot.start_at);
        const selected = slot.id === selectedId;
        return (
          <button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(slot.id)}
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-colors",
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                : "border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[17px] leading-[1.2] font-semibold tracking-[-0.015em] text-[var(--color-text)]">
                {formatDay(start, locale)}
              </div>
              <div className="data-mono mt-1 text-[13.5px] text-[var(--color-text-muted)]">
                {formatTimeRange(start, durationMinutes)}
              </div>
            </div>
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                  : "border-[var(--color-line-strong)] bg-[var(--color-surface)]",
              )}
            >
              {selected && (
                <Check className="h-3.5 w-3.5 text-[var(--color-on-primary)]" strokeWidth={3} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
