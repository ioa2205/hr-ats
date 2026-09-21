import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { CraftPricing } from "@/components/landing/craft-pricing";

export const metadata: Metadata = {
  title: "Pricing — TezHR",
  description: "TezHR trial and Pro pricing, limits, and billing details.",
  alternates: { canonical: "https://tezhr.uz/pricing" },
};

export default function PricingPage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <CraftPricing />
      </PublicShell>
    </div>
  );
}
