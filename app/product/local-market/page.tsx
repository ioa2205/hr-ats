import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { StubPage } from "@/components/landing/sub-pages/stub-page";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Built for the Uzbek market — TezHR",
  description:
    "Local title and skill taxonomy — 1С, Главбух, SAP, Uzum, UzCard. TezHR knows what each one means in context.",
};

export default async function LocalMarketPage() {
  const { t } = await getT();
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <StubPage
          kickerKey="landing.why.card_2_kicker"
          headlineKey="landing.product.lm.headline"
          ledeKey="landing.product.lm.lede"
          sections={[
            {
              titleKey: "landing.product.lm.sec_1_title",
              bodyKey: "landing.product.lm.sec_1_body",
            },
            {
              titleKey: "landing.product.lm.sec_2_title",
              bodyKey: "landing.product.lm.sec_2_body",
            },
            {
              titleKey: "landing.product.lm.sec_3_title",
              bodyKey: "landing.product.lm.sec_3_body",
            },
          ]}
          backLabel={t("landing.product.back_home")}
          callToActionKey="landing.hero.cta_primary_short"
        />
      </PublicShell>
    </div>
  );
}
