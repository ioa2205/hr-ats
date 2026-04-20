"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Mail, Send } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import { shareHref, type ShareChannel } from "@/lib/share/messages";

interface ShareButtonsProps {
  url: string;
  title: string;
  company: string;
}

interface ChannelMeta {
  channel: ShareChannel;
  labelKey:
    | "hr.job.share.btn_telegram"
    | "hr.job.share.btn_whatsapp"
    | "hr.job.share.btn_linkedin"
    | "hr.job.share.btn_email";
  icon: React.ReactNode;
}

const CHANNELS: ChannelMeta[] = [
  { channel: "telegram", labelKey: "hr.job.share.btn_telegram", icon: <Send className="h-3 w-3" /> },
  { channel: "whatsapp", labelKey: "hr.job.share.btn_whatsapp", icon: <Send className="h-3 w-3" /> },
  { channel: "linkedin", labelKey: "hr.job.share.btn_linkedin", icon: <Send className="h-3 w-3" /> },
  { channel: "email", labelKey: "hr.job.share.btn_email", icon: <Mail className="h-3 w-3" /> },
];

export function ShareButtons({ url, title, company }: ShareButtonsProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }, [url]);

  return (
    <div className="flex flex-wrap gap-2">
      <TezButton
        variant="primary"
        size="md"
        onClick={handleCopy}
        leadingIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      >
        {copied ? t("hr.job.share.btn_copied") : t("hr.job.share.btn_copy")}
      </TezButton>
      {CHANNELS.map(({ channel, labelKey, icon }) => (
        <a
          key={channel}
          href={shareHref(channel, { url, title, company, locale }, t)}
          target={channel === "email" ? "_self" : "_blank"}
          rel="noopener noreferrer"
        >
          <TezButton variant="secondary" size="md" leadingIcon={icon}>
            {t(labelKey)}
          </TezButton>
        </a>
      ))}
    </div>
  );
}
