"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

/** Decorative spinner that respects reduced-motion. Pair with visible text. */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none", className)}
      aria-hidden="true"
    />
  );
}

/**
 * A labelled control row: title + description on the left, control on the right.
 * Stacks vertically on phones so long RU/UZ labels never collide with the control.
 */
export function SettingRow({
  title,
  description,
  control,
  htmlFor,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  const Heading = htmlFor ? "label" : "div";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          {...(htmlFor ? { htmlFor } : {})}
          className="block text-[13.5px] font-semibold text-[var(--color-text)]"
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Inline "saving / saved / error" caption with a fixed height to avoid layout shift. */
export function SaveStatusLine({
  status,
  savedLabel,
  errorLabel,
}: {
  status: "idle" | "saving" | "saved" | "error";
  savedLabel: string;
  errorLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="h-4 text-[11.5px]" role="status" aria-live="polite">
      {status === "saving" ? (
        <span className="text-[var(--color-text-subtle)]">{t("common.saving")}</span>
      ) : status === "saved" ? (
        <span className="inline-flex items-center gap-1 font-medium text-[var(--color-success)]">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {savedLabel}
        </span>
      ) : status === "error" ? (
        <span className="font-medium text-[var(--color-danger)]">{errorLabel}</span>
      ) : null}
    </div>
  );
}

/**
 * Sticky bottom save bar shared by the AI, notifications, and templates editors.
 * Each caller computes its own `visible`, `message`, and disabled logic so the
 * existing dirty/parity/block behavior is preserved exactly.
 */
export function SettingsSaveBar({
  visible,
  message,
  onSave,
  saveLabel,
  saving = false,
  saveDisabled = false,
  saveIcon,
  onDiscard,
  discardLabel,
  discardDisabled = false,
}: {
  visible: boolean;
  message: ReactNode;
  onSave: () => void;
  saveLabel: string;
  saving?: boolean;
  saveDisabled?: boolean;
  saveIcon?: ReactNode;
  onDiscard?: () => void;
  discardLabel?: string;
  discardDisabled?: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="sticky bottom-3 z-10 mt-4">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 shadow-level-2">
        <div className="min-w-0 text-[12.5px]">{message}</div>
        <div className="flex shrink-0 items-center gap-2">
          {onDiscard && discardLabel && (
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={discardDisabled}>
              {discardLabel}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={saveDisabled || saving}
          >
            {saving ? <ButtonSpinner /> : saveIcon}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Destructive / important confirmation dialog built on the unified Radix Dialog
 * (focus trap, Escape, theme-correct portal, bottom-sheet on phones). Supports
 * an optional "type to confirm" guard for irreversible actions.
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  confirmingLabel?: string;
  cancelLabel: string;
  onConfirm: () => void;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  /** When set, the confirm button stays disabled until the user types this value. */
  typeToConfirm?: string;
  typeToConfirmHint?: ReactNode;
  typeToConfirmLabel?: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({ open, onOpenChange, ...rest }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {/* Body mounts fresh per open (Radix unmounts content on close), so the
            type-to-confirm field resets without a setState-in-effect. */}
        <ConfirmDialogBody onOpenChange={onOpenChange} {...rest} />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialogBody({
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  cancelLabel,
  onConfirm,
  tone = "danger",
  busy = false,
  error,
  typeToConfirm,
  typeToConfirmHint,
  typeToConfirmLabel,
  confirmDisabled = false,
  children,
}: Omit<ConfirmDialogProps, "open">) {
  const [typed, setTyped] = useState("");

  const typeOk =
    !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.trim().toLowerCase();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className="flex flex-col gap-3 px-6 pt-4">
        {children}
        {typeToConfirm && (
          <div className="flex flex-col gap-1.5">
            {typeToConfirmHint && (
              <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
                {typeToConfirmHint}
              </p>
            )}
            <Input
              aria-label={typeToConfirmLabel ?? String(title)}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={typeToConfirm}
              inputSize="lg"
              autoComplete="off"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
        )}
        {error && (
          <p className="text-[12px] text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy || confirmDisabled || !typeOk}
        >
          {busy && <ButtonSpinner />}
          {busy && confirmingLabel ? confirmingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

interface AvatarUploaderLabels {
  change: string;
  remove: string;
  hint: string;
  badType: string;
  tooLarge: string;
  uploadFailed: string;
}

/**
 * Shared avatar / company-logo uploader. Encapsulates the cover-crop-to-256px
 * resize, the multipart POST, and the DELETE — identical for the profile and
 * company surfaces, only the endpoint/field/limit differ.
 */
export function AvatarUploader({
  name,
  url,
  onUrl,
  endpoint,
  fieldName,
  responseKey,
  maxBytes,
  labels,
  canEdit = true,
}: {
  name: string;
  url: string | null;
  onUrl: (url: string | null) => void;
  endpoint: string;
  fieldName: string;
  responseKey: string;
  maxBytes: number;
  labels: AvatarUploaderLabels;
  canEdit?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(labels.badType);
      return;
    }
    if (file.size > maxBytes) {
      setError(labels.tooLarge);
      return;
    }
    setUploading(true);
    try {
      const resized = await resizeTo256Png(file);
      const fd = new FormData();
      fd.append(fieldName, resized, `${fieldName}.png`);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Record<string, string>;
      onUrl(data[responseKey]);
    } catch {
      setError(labels.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onUrl(null);
    } catch {
      setError(labels.uploadFailed);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "?"} src={url} size="xl" />
      {canEdit && (
        <div className="flex min-w-0 flex-col gap-1.5">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? <ButtonSpinner /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
              {labels.change}
            </Button>
            {url && (
              <Button size="sm" variant="ghost" onClick={handleRemove} disabled={uploading}>
                {labels.remove}
              </Button>
            )}
          </div>
          <p className="max-w-[260px] text-[11px] leading-[1.45] text-[var(--color-text-subtle)]">
            {labels.hint}
          </p>
          {error && <p className="text-[11.5px] text-[var(--color-danger)]">{error}</p>}
        </div>
      )}
    </div>
  );
}

/** Cover-crop an image file to a 256×256 PNG blob. */
async function resizeTo256Png(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("image_load"));
    im.src = dataUrl;
  });

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("encode_failed");
  return blob;
}
