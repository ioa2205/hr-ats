import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { StubPage } from "@/components/landing/sub-pages/stub-page";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Trilingual screening — TezHR",
  description:
    "How TezHR screens CVs in Russian, Uzbek (Cyrillic and Latin), and English against one job rubric.",
  alternates: { canonical: "https://tezhr.uz/product/multilingual" },
};

export default async function MultilingualPage() {
  const { t } = await getT();
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <StubPage
          kickerKey="landing.why.card_1_kicker"
          headlineKey="landing.product.ml.headline"
          ledeKey="landing.product.ml.lede"
          sections={[
            {
              titleKey: "landing.product.ml.sec_1_title",
              bodyKey: "landing.product.ml.sec_1_body",
            },
            {
              titleKey: "landing.product.ml.sec_2_title",
              bodyKey: "landing.product.ml.sec_2_body",
            },
            {
              titleKey: "landing.product.ml.sec_3_title",
              bodyKey: "landing.product.ml.sec_3_body",
            },
          ]}
          backLabel={t("landing.product.back_home")}
          callToActionKey="landing.hero.cta_primary_short"
        />
      </PublicShell>
    </div>
  );
}
