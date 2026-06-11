import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";
import { ProContactDialog } from "../pricing/pro-contact-dialog";

const FINAL_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=final`;

export async function FinalCTA() {
  const { t } = await getT();
  return (
    <section style={{ background: "var(--night)", color: "var(--on-night)", padding: "clamp(88px, 10vw, 132px) 24px" }}>
      <div className="relative mx-auto text-center lp-reveal" style={{ maxWidth: 880 }}>
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="lp-signal" aria-hidden />
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8fc2f5" }}>
            {t("landing.final.kicker_new")}
          </span>
          <span className="lp-signal" aria-hidden />
        </div>
        <h2
          className="lp-display"
          style={{ margin: 0, color: "var(--on-night)", fontSize: "clamp(40px, 6vw + 12px, 76px)" }}
        >
          {t("landing.final.heading_a_new")} <span style={{ color: "#8fc2f5" }}>{t("landing.final.heading_b_new")}</span>.
        </h2>
        <p className="mx-auto mt-6 text-[clamp(16px,1vw+12px,20px)] leading-[1.55]" style={{ color: "var(--on-night-muted)", maxWidth: 560 }}>
          {t("landing.final.sub_new")}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={FINAL_HREF} className="btn-primary" style={{ minHeight: 48, padding: "14px 26px", fontSize: 15 }}>
            {t("landing.final.cta_primary_new")}
            <ArrowIcon size={16} color="var(--color-on-primary)" />
          </Link>
          <div className="w-full max-w-[260px] sm:w-auto">
            <ProContactDialog
              labels={{
                triggerLabel: t("landing.final.cta_talk"),
                heading: t("landing.pricing.pro_dialog_heading"),
                intro: t("landing.pricing.pro_dialog_intro"),
                closeLabel: t("landing.hero.demo_close"),
                nameLabel: t("landing.pricing.pro_dialog_name"),
                emailLabel: t("landing.pricing.pro_dialog_email"),
                companyLabel: t("landing.pricing.pro_dialog_company"),
                teamSizeLabel: t("landing.pricing.pro_dialog_team"),
                channelLabel: t("landing.pricing.pro_dialog_channel"),
                messageLabel: t("landing.pricing.pro_dialog_message"),
                messagePlaceholder: t("landing.pricing.pro_dialog_message_ph"),
                submit: t("landing.pricing.pro_dialog_submit"),
                submitting: t("landing.pricing.pro_dialog_submitting"),
                successHeading: t("landing.pricing.pro_dialog_success_h"),
                successBody: t("landing.pricing.pro_dialog_success_b"),
                errorGeneric: t("landing.pricing.pro_dialog_err_generic"),
                errorRateLimited: t("landing.pricing.pro_dialog_err_rate"),
                channelTelegram: "Telegram",
                channelPhone: t("landing.pricing.pro_dialog_ch_phone"),
                channelEmail: "Email",
                teamSizes: ["1–5", "6–20", "21–100", "100+"],
              }}
            />
          </div>
        </div>
        <div
          className="mono mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t pt-6 text-[11px] tracking-[0.06em]"
          style={{ borderColor: "rgba(244,241,234,0.14)", color: "var(--on-night-muted)" }}
        >
          <span>{t("landing.final.note_setup_new")}</span>
          <span aria-hidden>·</span>
          <span>{t("landing.final.note_cancel_new")}</span>
          <span aria-hidden>·</span>
          <span>{t("landing.final.note_support_new")}</span>
        </div>
      </div>
    </section>
  );
}
