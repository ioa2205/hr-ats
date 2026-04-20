import { getT } from "@/lib/i18n/server";
import { Wordmark } from "../icons";
import { LOGIN_HREF, SIGNUP_HREF } from "../shared";
import { ScrollSpyNav } from "./scroll-spy-nav";

export interface NavItem {
  id: string;
  href: string;
  labelKey: Parameters<Awaited<ReturnType<typeof getT>>["t"]>[0];
}

const NAV_ITEMS: NavItem[] = [
  { id: "product", href: "/#product", labelKey: "landing.nav.product" },
  { id: "how", href: "/#how", labelKey: "landing.nav.how" },
  { id: "customers", href: "/#customers", labelKey: "landing.nav.customers" },
  { id: "pricing", href: "/#pricing", labelKey: "landing.nav.pricing" },
];

export async function LandingNav() {
  const { t } = await getT();
  const items = NAV_ITEMS.map((it) => ({ ...it, label: t(it.labelKey) }));
  return (
    <ScrollSpyNav
      items={items}
      labels={{
        signin: t("landing.nav.signin"),
        cta: t("landing.nav.cta"),
        menuOpen: t("landing.nav.menu_open"),
        menuClose: t("landing.nav.menu_close"),
        sectionsHeading: t("landing.nav.sections_heading"),
      }}
      signupHref={SIGNUP_HREF}
      loginHref={LOGIN_HREF}
      brand={<Wordmark size={28} />}
      brandMobile={<Wordmark size={24} />}
      homeHref="/"
    />
  );
}

export { NAV_ITEMS };
