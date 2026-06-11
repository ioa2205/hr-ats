"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button, Input } from "@/components/ui";
import QRCode from "qrcode";
import { useTranslation } from "@/lib/i18n/provider";

interface CopyLinkBlockProps {
  url: string;
}

export function CopyLinkBlock({ url }: CopyLinkBlockProps) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, width: 160 }).then(setQrSvg);
  }, [url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-[var(--color-text)] text-sm font-medium">{t("hr.job.public_link")}</label>
      <div className="flex gap-2">
        <Input value={url} readOnly className="flex-1" />
        <Button variant="tonal" size="md" onClick={handleCopy} className="shrink-0">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              {t("common.copied")}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t("common.copy")}
            </>
          )}
        </Button>
      </div>
      {qrSvg && <div className="w-40" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
    </div>
  );
}
