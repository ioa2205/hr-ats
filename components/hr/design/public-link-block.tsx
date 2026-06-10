"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import QRCode from "qrcode";
import { useTranslation } from "@/lib/i18n/provider";
import { Button } from "@/components/ui";

interface PublicLinkBlockProps {
  url: string;
  layout?: "stacked" | "inline";
}

export function PublicLinkBlock({ url, layout = "stacked" }: PublicLinkBlockProps) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, width: 120 }).then(setQrSvg);
  }, [url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <div className={layout === "inline" ? "flex items-start gap-4" : undefined}>
      <div className="flex-1">
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            aria-label={t("hr.job.public_link_title")}
            className="data-mono h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-focus)]"
          />
          <Button
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        </div>
      </div>
      {qrSvg && layout === "stacked" && (
        <div className="mt-3.5 flex justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] p-3.5">
          <div className="w-[120px] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      )}
      {qrSvg && layout === "inline" && (
        <div className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] p-2.5">
          <div className="w-[88px] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      )}
      {qrSvg && layout === "stacked" && (
        <div className="mt-2.5 flex gap-1.5">
          <a
            href={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
            download="apply-qr.svg"
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 text-[11.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
          >
            <Download className="h-3.5 w-3.5" />
            QR
          </a>
        </div>
      )}
    </div>
  );
}
