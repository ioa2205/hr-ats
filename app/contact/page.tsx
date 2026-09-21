import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { ContactContent } from "@/components/landing/contact-content";

export const metadata: Metadata = {
  title: "Contact — TezHR",
  description:
    "Contact TezHR about the product, your workspace, or a Pro request by form or Telegram.",
  alternates: { canonical: "https://tezhr.uz/contact" },
};

export default function ContactPage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <ContactContent />
      </PublicShell>
    </div>
  );
}
