import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { StubPage } from "@/components/landing/sub-pages/stub-page";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Security & data protection — TezHR",
  description:
    "Where candidate data lives, who can see it, how deletion works. Honest specifics — no marketing theatre.",
  alternates: { canonical: "https://tezhr.uz/security" },
};

export default async function SecurityPage() {
  const { t } = await getT();
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <StubPage
          kickerKey="landing.why.card_3_kicker"
          headlineKey="landing.product.sec.headline"
          ledeKey="landing.product.sec.lede"
          sections={[
            {
              titleKey: "landing.product.sec.sec_1_title",
              bodyKey: "landing.product.sec.sec_1_body",
            },
            {
              titleKey: "landing.product.sec.sec_2_title",
              bodyKey: "landing.product.sec.sec_2_body",
            },
            {
              titleKey: "landing.product.sec.sec_3_title",
              bodyKey: "landing.product.sec.sec_3_body",
            },
          ]}
          backLabel={t("landing.product.back_home")}
          callToActionKey="landing.hero.cta_primary_short"
        />
      </PublicShell>
    </div>
  );
}
