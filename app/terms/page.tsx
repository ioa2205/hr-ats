import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { LegalContent } from "@/components/landing/legal-content";

export const metadata: Metadata = {
  title: "Terms — TezHR",
  description: "Terms of use for the TezHR service.",
};

export default function TermsPage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <LegalContent kind="terms" />
      </PublicShell>
    </div>
  );
}
