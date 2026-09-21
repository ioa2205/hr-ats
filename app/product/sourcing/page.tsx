import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { StubPage } from "@/components/landing/sub-pages/stub-page";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Active sourcing — TezHR",
  description:
    "Search your existing candidate pool, a connected hh.uz account, and configured public Telegram sources from a TezHR vacancy.",
  alternates: { canonical: "https://tezhr.uz/product/sourcing" },
};

export default async function SourcingProductPage() {
  const { t } = await getT();
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <StubPage
          kickerKey="landing.product.src.kicker"
          headlineKey="landing.product.src.headline"
          ledeKey="landing.product.src.lede"
          sections={[
            {
              titleKey: "landing.product.src.sec_1_title",
              bodyKey: "landing.product.src.sec_1_body",
            },
            {
              titleKey: "landing.product.src.sec_2_title",
              bodyKey: "landing.product.src.sec_2_body",
            },
            {
              titleKey: "landing.product.src.sec_3_title",
              bodyKey: "landing.product.src.sec_3_body",
            },
          ]}
          backLabel={t("landing.product.back_home")}
          callToActionKey="landing.hero.cta_primary_short"
        />
      </PublicShell>
    </div>
  );
}
