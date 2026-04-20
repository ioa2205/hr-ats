import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";

export async function CandidatesRibbon() {
  const { t } = await getT();
  return (
    <aside
      aria-label={t("landing.candidates.ribbon_aria")}
      className="paper-grain"
      style={{
        background: "var(--paper-2)",
        borderTop: "1.5px solid var(--ink)",
        borderBottom: "1.5px solid var(--ink)",
      }}
    >
      <div
        className="mx-auto flex flex-col items-start gap-3 px-7 py-5 md:flex-row md:items-center md:gap-8 md:py-6"
        style={{ maxWidth: 1360 }}
      >
        <span
          className="mono text-[10px] tracking-[0.22em]"
          style={{ color: "var(--persimmon-2)" }}
        >
          {t("landing.candidates.ribbon_kicker")}
        </span>
        <span
          className="serif text-[clamp(20px,2vw+10px,28px)] italic leading-[1.25]"
          style={{ color: "var(--ink)" }}
        >
          {t("landing.candidates.ribbon_title")}
        </span>
        <span
          className="flex-1 text-[14px] leading-[1.5]"
          style={{ color: "var(--ink-2)" }}
        >
          {t("landing.candidates.ribbon_body")}
        </span>
        <Link
          href="/for-candidates"
          className="mono inline-flex items-center gap-2 border py-2 pl-3 pr-4 text-[12px] tracking-[0.08em]"
          style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
        >
          {t("landing.candidates.ribbon_cta")}
          <ArrowIcon size={12} color="var(--persimmon-2)" />
        </Link>
      </div>
    </aside>
  );
}
