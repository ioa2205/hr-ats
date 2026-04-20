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
        <label htmlFor={inputId} className="text-on-surface text-sm font-medium">
          {label}
        </label>
      )}
      <div
        className={cn(
          "bg-surface flex flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-2",
          "transition-colors duration-200 ease-[var(--ease-standard)]",
          hasError ? "border-danger" : "border-outline-variant focus-within:border-primary",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={tag}
            className="bg-primary-container text-on-primary-container inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="hover:bg-on-primary-container/10 rounded-full p-0.5"
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
          aria-label={label}
          className="text-on-surface placeholder:text-on-surface-variant/60 min-w-[120px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {hasError && (
        <p className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
