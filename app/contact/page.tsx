import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { ContactContent } from "@/components/landing/contact-content";

export const metadata: Metadata = {
  title: "Contact — TezHR",
  description:
    "Questions, pitches, ideas — write to TezHR. Fast replies on email or Telegram.",
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
