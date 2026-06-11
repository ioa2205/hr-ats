import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { getLandingCustomers, getLandingCaseStudies } from "@/lib/landing/proof";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";
import { SectionHeader } from "../section";

export async function Proof() {
  const { locale, t } = await getT();
  const [customers, studies] = await Promise.all([getLandingCustomers(), getLandingCaseStudies(locale)]);
  const featured = studies.find((s) => s.featured) ?? studies[0] ?? null;

  return (
    <section id="customers" className="relative" style={{ background: "var(--paper)", padding: "clamp(72px, 8vw, 104px) 24px" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader
          eyebrow={t("landing.proof.section_tag")}
          meta={customers.length > 0 ? t("landing.proof.section_meta_with", { count: String(customers.length) }) : t("landing.proof.section_meta_without")}
          maxWidth={1000}
        >
          {t("landing.proof.heading")} <span className="lp-accent">{t("landing.proof.heading_em")}</span> {t("landing.proof.heading_tail")}
        </SectionHeader>

        {customers.length >= 5 ? (
          <LogoGrid customers={customers} />
        ) : customers.length > 0 ? (
          <LogoTriptych customers={customers} t={t} />
        ) : (
          <HonestEmptyState t={t} />
        )}

        {featured && (
          <article className="lp-panel mt-12 grid gap-0 overflow-hidden md:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-5 p-8 md:p-10">
              <span className="lp-eyebrow is-accent">{t("landing.proof.case_study_tag")}</span>
              <h3 className="lp-h2 m-0" style={{ fontSize: "clamp(26px, 3vw + 8px, 38px)" }}>
                {featured.headline}
              </h3>
              <blockquote
                className="m-0 text-[clamp(17px,1.2vw+10px,20px)] leading-[1.55]"
                style={{ color: "var(--ink-2)", borderLeft: "3px solid var(--ikat)", paddingLeft: 16 }}
              >
                {featured.quote}
              </blockquote>
              <div className="flex items-center gap-3">
                {featured.speaker_photo_url && (
                  <Image
                    src={featured.speaker_photo_url}
                    alt={featured.speaker_name}
                    width={44}
                    height={44}
                    className="rounded-full"
                    style={{ border: "1px solid var(--rule)" }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{featured.speaker_name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{featured.speaker_role}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1" style={{ borderTop: "1px solid var(--rule)" }}>
              {[
                { v: featured.metric_1_value, l: featured.metric_1_label },
                featured.metric_2_value ? { v: featured.metric_2_value, l: featured.metric_2_label ?? "" } : null,
                featured.metric_3_value ? { v: featured.metric_3_value, l: featured.metric_3_label ?? "" } : null,
              ]
                .filter((x): x is { v: string; l: string } => x !== null)
                .map((m, i, arr) => (
                  <div
                    key={m.l + String(i)}
                    className="flex flex-col gap-2 p-6"
                    style={{
                      borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : 0,
                      background: i === 0 ? "var(--ikat-tint)" : "var(--paper-3)",
                    }}
                  >
                    <div
                      className="mono leading-none"
                      style={{ fontSize: "clamp(36px, 3.5vw + 12px, 52px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ikat)" }}
                    >
                      {m.v}
                    </div>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{m.l}</div>
                  </div>
                ))}
            </div>
          </article>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-7" style={{ borderColor: "var(--rule)" }}>
          <p className="m-0 max-w-[620px] text-[16px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
            {t("landing.proof.join_note")}
          </p>
          <Link href={`${SIGNUP_HREF}?utm_source=landing&utm_section=proof`} className="btn-primary">
            {t("landing.proof.join_cta")}
            <ArrowIcon size={16} color="var(--color-on-primary)" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LogoGrid({ customers }: { customers: Awaited<ReturnType<typeof getLandingCustomers>> }) {
  return (
    <ul
      className="m-0 grid list-none gap-0 overflow-hidden rounded-xl p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      style={{ border: "1px solid var(--rule)" }}
    >
      {customers.slice(0, 12).map((c) => (
        <li
          key={c.id}
          className="flex aspect-[3/2] items-center justify-center"
          style={{ borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: "var(--paper-3)" }}
        >
          {c.logo_url ? (
            <Image
              src={c.logo_url}
              alt={c.display_name}
              width={160}
              height={48}
              className="max-h-12 w-auto"
              style={{ filter: "grayscale(100%)", opacity: 0.8 }}
            />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-3)" }}>{c.display_name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function LogoTriptych({
  customers,
  t,
}: {
  customers: Awaited<ReturnType<typeof getLandingCustomers>>;
  t: (key: Parameters<Awaited<ReturnType<typeof getT>>["t"]>[0]) => string;
}) {
  return (
    <div className="grid gap-0 overflow-hidden rounded-xl md:grid-cols-4" style={{ border: "1px solid var(--rule)" }}>
      {customers.slice(0, 3).map((c, i) => (
        <div
          key={c.id}
          className="flex min-h-[140px] items-center justify-center p-8"
          style={{ borderRight: i < 3 ? "1px solid var(--rule)" : 0, background: "var(--paper-3)" }}
        >
          {c.logo_url ? (
            <Image
              src={c.logo_url}
              alt={c.display_name}
              width={200}
              height={80}
              className="max-h-16 w-auto"
              style={{ filter: "grayscale(100%)", opacity: 0.85 }}
            />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{c.display_name}</span>
          )}
        </div>
      ))}
      <div className="flex flex-col justify-center gap-3 p-7" style={{ background: "var(--ikat-tint)" }}>
        <div className="lp-eyebrow is-accent">{t("landing.proof.early_days_kicker")}</div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ikat-on-tint)" }}>
          {t("landing.proof.early_days_headline")}
        </div>
      </div>
    </div>
  );
}

function HonestEmptyState({ t }: { t: (key: Parameters<Awaited<ReturnType<typeof getT>>["t"]>[0]) => string }) {
  const rows = [
    { l: t("landing.proof.empty_point_1_label"), v: t("landing.proof.empty_point_1_value") },
    { l: t("landing.proof.empty_point_2_label"), v: t("landing.proof.empty_point_2_value") },
    { l: t("landing.proof.empty_point_3_label"), v: t("landing.proof.empty_point_3_value") },
  ];
  return (
    <div className="lp-panel flex flex-col gap-8 p-8 md:flex-row md:items-stretch md:gap-0 md:p-10">
      <div className="flex-1 md:pr-10">
        <div className="lp-eyebrow is-accent mb-3">{t("landing.proof.empty_kicker")}</div>
        <h3 className="lp-h2 m-0" style={{ fontSize: "clamp(26px, 3vw + 8px, 40px)" }}>
          {t("landing.proof.empty_headline")}
        </h3>
        <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
          {t("landing.proof.empty_body")}
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-0 p-0 md:w-[320px]" style={{ borderTop: "1px solid var(--rule)" }}>
        {rows.map((r, i) => (
          <li key={r.l} className="flex flex-col gap-1 py-4 md:px-6" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : 0 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>{r.l}</span>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
