"use client";

import { useId, useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";

interface TagInputProps {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  error,
}: TagInputProps) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t("hr.tag.placeholder");
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hasError = Boolean(error);

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2",
          "transition-colors duration-150 ease-[var(--ease-standard)]",
          hasError
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-line-strong)] focus-within:border-[var(--color-focus)]",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-primary-container)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-primary-container)]"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="rounded-full p-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-on-primary-container)_15%,transparent)]"
              aria-label={t("hr.tag.remove_label", { tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? effectivePlaceholder : ""}
          aria-label={label ?? effectivePlaceholder}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
        />
      </div>
      {hasError && (
        <p className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
