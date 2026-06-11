import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { TezSignalWordmark } from "@/components/brand/tez-signal";
import { TelegramIcon } from "../icons";
import { TELEGRAM_URL } from "../constants";
import { LocaleSwitcher } from "./locale-switcher";
import { StatusPill } from "./status-pill";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

function Col({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <div className="lp-eyebrow is-plain mb-4" style={{ color: "var(--ink-4)" }}>
        {title}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.href + item.label}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] leading-tight transition-colors hover:text-[var(--ikat)]"
                style={{ color: "var(--ink-2)" }}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-[14px] leading-tight transition-colors hover:text-[var(--ikat)]"
                style={{ color: "var(--ink-2)" }}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function LandingFooter() {
  const { t } = await getT();

  const product: FooterLink[] = [
    { label: t("landing.footer.n_features"), href: "/#product" },
    { label: t("landing.footer.n_pricing"), href: "/#pricing" },
    { label: t("landing.footer.n_security"), href: "/security" },
  ];
  const customers: FooterLink[] = [
    { label: t("landing.footer.n_case_studies"), href: "/#customers" },
    { label: t("landing.footer.n_multilingual"), href: "/product/multilingual" },
    { label: t("landing.footer.n_local_market"), href: "/product/local-market" },
  ];
  const company: FooterLink[] = [
    { label: t("landing.footer.n_about"), href: "/about" },
    { label: t("landing.footer.n_contact"), href: "/contact" },
    { label: t("landing.footer.legal_candidate_rights"), href: "/for-candidates" },
  ];

  return (
    <footer
      id="contact"
      style={{
        position: "relative",
        background: "var(--paper-2)",
        borderTop: "1px solid var(--rule)",
        padding: "64px 24px 28px",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <div className="grid gap-10 md:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <div className="flex max-w-[360px] flex-col gap-4">
            <TezSignalWordmark size={26} suffix="Tashkent" />
            <p className="m-0 text-[15px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
              {t("landing.footer.tagline")}
            </p>
            <div className="mt-2">
              <LocaleSwitcher />
            </div>
          </div>
          <Col title={t("landing.footer.col_product")} items={product} />
          <Col title={t("landing.footer.col_customers")} items={customers} />
          <Col title={t("landing.footer.col_company_new")} items={company} />
        </div>

        <div
          className="mt-12 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: "var(--rule)" }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="mono text-[11px] tracking-[0.06em]" style={{ color: "var(--ink-4)" }}>
              {t("landing.footer.copy")}
            </span>
            <Link href="/terms" className="text-[13px] transition-colors hover:text-[var(--ikat)]" style={{ color: "var(--ink-3)" }}>
              {t("landing.footer.legal_terms")}
            </Link>
            <Link href="/privacy" className="text-[13px] transition-colors hover:text-[var(--ikat)]" style={{ color: "var(--ink-3)" }}>
              {t("landing.footer.legal_privacy")}
            </Link>
            <Link
              href="/for-candidates"
              className="text-[13px] transition-colors hover:text-[var(--ikat)]"
              style={{ color: "var(--ink-3)" }}
            >
              {t("landing.footer.legal_candidate_rights")}
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <StatusPill />
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] transition-colors hover:text-[var(--ikat)]"
              style={{ color: "var(--ink-2)" }}
            >
              <TelegramIcon size={15} /> Telegram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
