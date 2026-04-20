"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import QRCode from "qrcode";
import { useTranslation } from "@/lib/i18n/provider";
import { TezButton } from "./button";

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
        <div className="flex gap-1.5">
          <input
            readOnly
            value={url}
            className="border-rule-2 bg-paper text-ink h-[32px] min-w-0 flex-1 rounded-[4px] border px-2.5 text-[12px]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          />
          <TezButton
            variant="ink"
            onClick={handleCopy}
            leadingIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          >
            {copied ? t("common.copied") : t("common.copy")}
          </TezButton>
        </div>
      </div>
      {qrSvg && layout === "stacked" && (
        <div className="border-rule bg-bone mt-3.5 flex justify-center rounded-md border p-3.5">
          <div className="w-[120px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      )}
      {qrSvg && layout === "inline" && (
        <div className="border-rule bg-bone shrink-0 rounded-md border p-2.5">
          <div className="w-[88px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      )}
      {qrSvg && layout === "stacked" && (
        <div className="mt-2.5 flex gap-1.5">
          <a
            href={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
            download="apply-qr.svg"
            className="border-rule-2 bg-paper text-ink-2 shadow-tez-1 hover:bg-bone inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-[4px] border px-2 text-[11.5px] font-medium"
          >
            <Download className="h-3 w-3" />
            QR
          </a>
        </div>
      )}
    </div>
  );
}
