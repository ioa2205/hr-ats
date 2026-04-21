import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { getLandingCustomers, getLandingCaseStudies } from "@/lib/landing/proof";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";

export async function Proof() {
  const { locale, t } = await getT();
  const [customers, studies] = await Promise.all([
    getLandingCustomers(),
    getLandingCaseStudies(locale),
  ]);
  const featured = studies.find((s) => s.featured) ?? studies[0] ?? null;

  return (
    <section
      id="customers"
      className="paper-grain relative"
      style={{ background: "var(--paper-2)", padding: "120px 28px 100px" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        <div
          className="mb-6 flex flex-wrap items-end gap-7 border-b pb-3.5"
          style={{ borderColor: "var(--ink)" }}
        >
          <span
            className="mono text-[11px] tracking-[0.2em]"
            style={{ color: "var(--persimmon-2)" }}
          >
            {t("landing.proof.section_tag")}
          </span>
          <span
            className="serif text-[20px] italic"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.proof.section_title")}
          </span>
          <span
            className="mono ml-auto text-[11px] tracking-[0.18em]"
            style={{ color: "var(--ink-3)" }}
          >
            {customers.length > 0
              ? t("landing.proof.section_meta_with", {
                  count: String(customers.length),
                })
              : t("landing.proof.section_meta_without")}
          </span>
        </div>

        <h2
          className="serif max-w-[1100px]"
          style={{
            margin: "0 0 48px",
            fontSize: "clamp(40px, 5vw + 16px, 82px)",
            lineHeight: 0.96,
            letterSpacing: "-0.035em",
          }}
        >
          {t("landing.proof.heading")}{" "}
          <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
            {t("landing.proof.heading_em")}
          </em>{" "}
          {t("landing.proof.heading_tail")}
        </h2>

        {customers.length >= 5 ? (
          <LogoGrid customers={customers} />
        ) : customers.length > 0 ? (
          <LogoTriptych customers={customers} t={t} />
        ) : (
          <HonestEmptyState t={t} />
        )}

        {featured && (
          <article
            className="mt-14 grid gap-0 md:grid-cols-[1.1fr_1fr]"
            style={{ border: "1.5px solid var(--ink)", background: "var(--paper-3)" }}
          >
            <div className="flex flex-col gap-5 p-7 md:p-10">
              <span
                className="mono text-[10px] tracking-[0.18em]"
                style={{ color: "var(--persimmon-2)" }}
              >
                {t("landing.proof.case_study_tag")}
              </span>
              <h3
                className="serif m-0 text-[clamp(28px,3vw+10px,44px)] leading-[1.1] tracking-[-0.025em]"
              >
                {featured.headline}
              </h3>
              <blockquote
                className="serif m-0 text-[clamp(18px,1.5vw+10px,22px)] italic leading-[1.5]"
                style={{ color: "var(--ink-2)", borderLeft: "3px solid var(--persimmon)", paddingLeft: 16 }}
              >
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                {featured.speaker_photo_url && (
                  <Image
                    src={featured.speaker_photo_url}
                    alt={featured.speaker_name}
                    width={44}
                    height={44}
                    className="rounded-full"
                    style={{ border: "1px solid var(--ink)" }}
                  />
                )}
                <div>
                  <div className="serif text-[16px] tracking-[-0.01em]">
                    {featured.speaker_name}
                  </div>
                  <div
                    className="mono text-[11px] tracking-[0.06em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {featured.speaker_role}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1"
              style={{ borderTop: "1.5px solid var(--ink)" }}
            >
              {[
                { v: featured.metric_1_value, l: featured.metric_1_label },
                featured.metric_2_value
                  ? { v: featured.metric_2_value, l: featured.metric_2_label ?? "" }
                  : null,
                featured.metric_3_value
                  ? { v: featured.metric_3_value, l: featured.metric_3_label ?? "" }
                  : null,
              ]
                .filter((x): x is { v: string; l: string } => x !== null)
                .map((m, i, arr) => (
                  <div
                    key={m.l + String(i)}
                    className="flex flex-col gap-2 p-6"
                    style={{
                      borderBottom: i < arr.length - 1 ? "1.5px solid var(--ink)" : 0,
                      background: i === 0 ? "var(--ink)" : "var(--paper-3)",
                      color: i === 0 ? "var(--paper-3)" : "var(--ink)",
                    }}
                  >
                    <div
                      className="serif leading-none tracking-[-0.04em]"
                      style={{
                        fontSize: "clamp(44px, 4vw + 16px, 64px)",
                        color: i === 0 ? "var(--saffron)" : "var(--persimmon-2)",
                      }}
                    >
                      {m.v}
                    </div>
                    <div
                      className="mono text-[11px] tracking-[0.14em]"
                      style={{ color: i === 0 ? "#C8C0B0" : "var(--ink-3)" }}
                    >
                      {m.l}
                    </div>
                  </div>
                ))}
            </div>
          </article>
        )}

        <div
          className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: "var(--ink)" }}
        >
          <p
            className="serif m-0 max-w-[620px] text-[16px] italic leading-[1.5]"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.proof.join_note")}
          </p>
          <Link
            href={`${SIGNUP_HREF}?utm_source=landing&utm_section=proof`}
            className="btn-primary"
          >
            {t("landing.proof.join_cta")}
            <ArrowIcon size={14} color="var(--paper-3)" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LogoGrid({ customers }: { customers: Awaited<ReturnType<typeof getLandingCustomers>> }) {
  return (
    <ul
      className="m-0 grid list-none gap-0 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      style={{
        borderTop: "1.5px solid var(--ink)",
        borderLeft: "1.5px solid var(--ink)",
      }}
    >
      {customers.slice(0, 12).map((c) => (
        <li
          key={c.id}
          className="flex aspect-[3/2] items-center justify-center"
          style={{
            borderRight: "1.5px solid var(--ink)",
            borderBottom: "1.5px solid var(--ink)",
            background: "var(--paper-3)",
          }}
        >
          {c.logo_url ? (
            <Image
              src={c.logo_url}
              alt={c.display_name}
              width={160}
              height={48}
              className="max-h-12 w-auto"
              style={{ filter: "grayscale(100%)", opacity: 0.85 }}
            />
          ) : (
            <span
              className="serif text-[18px] italic"
              style={{ color: "var(--ink-3)" }}
            >
              {c.display_name}
            </span>
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
    <div
      className="grid gap-0 md:grid-cols-4"
      style={{
        borderTop: "1.5px solid var(--ink)",
        borderBottom: "1.5px solid var(--ink)",
      }}
    >
      {customers.slice(0, 3).map((c, i) => (
        <div
          key={c.id}
          className="flex min-h-[140px] items-center justify-center p-8"
          style={{
            borderRight: i < 3 ? "1.5px solid var(--ink)" : 0,
            background: "var(--paper-3)",
          }}
        >
          {c.logo_url ? (
            <Image
              src={c.logo_url}
              alt={c.display_name}
              width={200}
              height={80}
              className="max-h-16 w-auto"
              style={{ filter: "grayscale(100%)", opacity: 0.9 }}
            />
          ) : (
            <span
              className="serif text-[24px] italic tracking-[-0.02em]"
              style={{ color: "var(--ink)" }}
            >
              {c.display_name}
            </span>
          )}
        </div>
      ))}
      <div
        className="flex flex-col justify-center gap-3 p-7"
        style={{ background: "var(--ink)", color: "var(--paper-3)" }}
      >
        <div
          className="mono text-[10px] tracking-[0.22em]"
          style={{ color: "var(--saffron)" }}
        >
          {t("landing.proof.early_days_kicker")}
        </div>
        <div className="serif text-[24px] leading-[1.1] tracking-[-0.02em] italic">
          {t("landing.proof.early_days_headline")}
        </div>
      </div>
    </div>
  );
}

function HonestEmptyState({
  t,
}: {
  t: (key: Parameters<Awaited<ReturnType<typeof getT>>["t"]>[0]) => string;
}) {
  const rows = [
    { l: t("landing.proof.empty_point_1_label"), v: t("landing.proof.empty_point_1_value") },
    { l: t("landing.proof.empty_point_2_label"), v: t("landing.proof.empty_point_2_value") },
    { l: t("landing.proof.empty_point_3_label"), v: t("landing.proof.empty_point_3_value") },
  ];
  return (
    <div
      className="flex flex-col gap-6 p-10 md:flex-row md:items-stretch md:gap-0"
      style={{ border: "1.5px solid var(--ink)", background: "var(--paper-3)" }}
    >
      <div className="flex-1 md:pr-10">
        <div
          className="mono mb-2 text-[11px] tracking-[0.22em]"
          style={{ color: "var(--persimmon-2)" }}
        >
          {t("landing.proof.empty_kicker")}
        </div>
        <h3
          className="serif m-0 text-[clamp(28px,3vw+10px,48px)] leading-[1.05] tracking-[-0.025em]"
        >
          {t("landing.proof.empty_headline")}
        </h3>
        <p
          className="serif mt-4 max-w-[520px] text-[17px] italic leading-[1.55]"
          style={{ color: "var(--ink-2)" }}
        >
          {t("landing.proof.empty_body")}
        </p>
      </div>
      <ul
        className="m-0 flex list-none flex-col gap-0 p-0 md:w-[320px]"
        style={{ borderLeft: "1.5px solid var(--ink)" }}
      >
        {rows.map((r, i) => (
          <li
            key={r.l}
            className="flex flex-col gap-1 px-6 py-4"
            style={{ borderBottom: i < rows.length - 1 ? "1px dashed var(--ink-4)" : 0 }}
          >
            <span
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: "var(--ink-3)" }}
            >
              {r.l}
            </span>
            <span className="serif text-[18px] italic tracking-[-0.01em]">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
