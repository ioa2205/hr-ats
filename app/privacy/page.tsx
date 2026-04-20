import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { LegalContent } from "@/components/landing/legal-content";

export const metadata: Metadata = {
  title: "Privacy — TezHR",
  description: "What data TezHR processes and why.",
};

export default function PrivacyPage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <LegalContent kind="privacy" />
      </PublicShell>
    </div>
  );
}
