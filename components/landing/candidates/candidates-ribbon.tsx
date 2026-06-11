import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";

export async function CandidatesRibbon() {
  const { t } = await getT();
  return (
    <aside
      aria-label={t("landing.candidates.ribbon_aria")}
      style={{ background: "var(--paper-2)", borderTop: "1px solid var(--rule)" }}
    >
      <div
        className="mx-auto flex flex-col items-start gap-4 px-6 py-7 md:flex-row md:items-center md:gap-8"
        style={{ maxWidth: 1200 }}
      >
        <div className="flex flex-col gap-1.5">
          <span className="lp-eyebrow">{t("landing.candidates.ribbon_kicker")}</span>
          <span style={{ fontSize: "clamp(19px,1.4vw+10px,24px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {t("landing.candidates.ribbon_title")}
          </span>
        </div>
        <span className="flex-1 text-[14.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
          {t("landing.candidates.ribbon_body")}
        </span>
        <Link href="/for-candidates" className="btn-ghost shrink-0" style={{ minHeight: 40 }}>
          {t("landing.candidates.ribbon_cta")}
          <ArrowIcon size={14} color="var(--ikat)" />
        </Link>
      </div>
    </aside>
  );
}
