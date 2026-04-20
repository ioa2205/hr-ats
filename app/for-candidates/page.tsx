import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { PublicShell } from "@/components/landing/shell/public-shell";
import { StubPage } from "@/components/landing/sub-pages/stub-page";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "For candidates — TezHR",
  description:
    "If someone shared a tezhr.uz/j/ link with you: this is what happens next. Privacy, response times, and your rights.",
};

export default async function ForCandidatesPage() {
  const { t } = await getT();
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <PublicShell>
        <StubPage
          kickerKey="landing.candidates.page_kicker"
          headlineKey="landing.candidates.page_headline"
          ledeKey="landing.candidates.page_lede"
          sections={[
            {
              titleKey: "landing.candidates.page_sec_1_title",
              bodyKey: "landing.candidates.page_sec_1_body",
            },
            {
              titleKey: "landing.candidates.page_sec_2_title",
              bodyKey: "landing.candidates.page_sec_2_body",
            },
            {
              titleKey: "landing.candidates.page_sec_3_title",
              bodyKey: "landing.candidates.page_sec_3_body",
            },
            {
              titleKey: "landing.candidates.page_sec_4_title",
              bodyKey: "landing.candidates.page_sec_4_body",
            },
          ]}
          backLabel={t("landing.product.back_home")}
        />
      </PublicShell>
    </div>
  );
}
