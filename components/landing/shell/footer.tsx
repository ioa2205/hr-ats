import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { TELEGRAM_URL } from "../constants";
import { TelegramIcon } from "../icons";
import { LocaleSwitcher } from "./locale-switcher";

const TAGLINE: Record<Locale, string> = {
  en: "AI-assisted recruiting for teams hiring in Uzbekistan.",
  ru: "Найм с поддержкой AI для команд в Узбекистане.",
  uz: "O‘zbekistonda yollayotgan jamoalar uchun AI yordamidagi rekruting.",
};

type FooterLink = { label: string; href: string };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="craft-footer-column">
      <h2>{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function LandingFooter() {
  const { locale, t } = await getT();
  return (
    <footer className="craft-footer craft-paper" id="contact">
      <div className="craft-container">
        <div className="craft-footer-grid">
          <div className="craft-footer-brand">
            <Link href="/" className="craft-wordmark">
              TezHR
            </Link>
            <p>{TAGLINE[locale]}</p>
            <LocaleSwitcher size="sm" />
          </div>
          <FooterColumn
            title={t("landing.footer.col_product")}
            links={[
              { label: t("landing.footer.n_features"), href: "/#product" },
              { label: t("landing.footer.n_pricing"), href: "/pricing" },
              { label: t("landing.nav.sourcing"), href: "/product/sourcing" },
              { label: t("landing.footer.n_multilingual"), href: "/product/multilingual" },
              { label: t("landing.footer.n_local_market"), href: "/product/local-market" },
            ]}
          />
          <FooterColumn
            title={t("landing.footer.col_company_new")}
            links={[
              { label: t("landing.footer.n_about"), href: "/about" },
              { label: t("landing.footer.n_contact"), href: "/contact" },
              { label: t("landing.footer.n_security"), href: "/security" },
              { label: t("landing.footer.legal_candidate_rights"), href: "/for-candidates" },
            ]}
          />
          <FooterColumn
            title={t("landing.footer.n_legal")}
            links={[
              { label: t("landing.footer.legal_terms"), href: "/terms" },
              { label: t("landing.footer.legal_privacy"), href: "/privacy" },
            ]}
          />
        </div>
        <div className="craft-footer-bottom">
          <span>{t("landing.footer.copy")}</span>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            <TelegramIcon size={15} /> Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
