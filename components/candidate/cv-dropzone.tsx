"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/types";
import { Upload, X, FileText } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024;

interface CvDropzoneProps {
  t: (key: TranslationKey) => string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function CvDropzone({ t, value, onChange, error }: CvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = error || localError;

  const validate = useCallback(
    (file: File): string | null => {
      if (file.type !== "application/pdf") {
        return t("apply.cv.error_type");
      }
      if (file.size > MAX_SIZE) {
        return t("apply.cv.error_size");
      }
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const err = validate(file);
      if (err) {
        setLocalError(err);
        onChange(null);
        return;
      }
      onChange(file);
    },
    [validate, onChange],
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="border-rule bg-bone-2 flex items-center gap-3 rounded-[5px] border px-3 py-3">
          <div className="bg-paper border-rule flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border">
            <FileText className="text-ink-3 h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ink truncate text-[14px] font-semibold">{value.name}</p>
            <p
              className="text-ink-4 mt-0.5 text-[11.5px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {formatSize(value.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setLocalError(null);
            }}
            className="text-ink-4 hover:bg-bone-3 hover:text-ink flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] transition-colors"
            aria-label={t("apply.cv.remove_label")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {displayError && (
          <p className="text-persimmon text-[12.5px]" role="alert">
            {displayError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border-2 border-dashed px-6 py-8 transition-colors",
          isDragging
            ? "border-ink bg-bone-2"
            : displayError
              ? "border-persimmon bg-persimmon-tint/40"
              : "border-rule-2 bg-bone-2/40 hover:border-ink-6 hover:bg-bone-2",
        )}
      >
        <Upload
          className={cn("h-6 w-6", isDragging ? "text-ink" : "text-ink-4")}
          strokeWidth={1.5}
        />
        <p className="text-ink text-[14px] font-semibold">{t("apply.upload_cv")}</p>
        <p className="text-ink-4 text-center text-[12.5px]">{t("apply.upload_hint")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleInputChange}
        tabIndex={-1}
      />
      {displayError && (
        <p className="text-persimmon text-[12.5px]" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
