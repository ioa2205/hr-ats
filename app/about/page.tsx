import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { AboutContent } from "@/components/landing/about-content";

export const metadata: Metadata = {
  title: "About — TezHR",
  description:
    "Why TezHR exists, what we believe, and who we're building for. Made in Tashkent.",
};

export default function AboutPage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <AboutContent />
      </PublicShell>
    </div>
  );
}
