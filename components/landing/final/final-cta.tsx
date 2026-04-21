import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";
import { ProContactDialog } from "../pricing/pro-contact-dialog";

const FINAL_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=final`;

export async function FinalCTA() {
  const { t } = await getT();
  return (
    <section
      className="night-grain relative overflow-hidden"
      style={{ background: "var(--night)", color: "var(--paper-3)", padding: "128px 28px" }}
    >
      <div
        aria-hidden
        className="ikat-bg absolute inset-0"
        style={{ opacity: 0.6 }}
      />
      <div className="relative mx-auto text-center" style={{ maxWidth: 1100 }}>
        <div
          className="mono mb-6 inline-flex items-center gap-4 text-[11px] tracking-[0.22em]"
          style={{ color: "var(--saffron)" }}
        >
          <span>★</span>
          <span>{t("landing.final.kicker_new")}</span>
          <span>★</span>
        </div>
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: "clamp(56px, 8vw + 16px, 128px)",
            lineHeight: 0.88,
            letterSpacing: "-0.045em",
            fontWeight: 400,
          }}
        >
          {t("landing.final.heading_a_new")}
          <br />
          <em style={{ fontStyle: "italic", color: "var(--persimmon)" }}>
            {t("landing.final.heading_b_new")}
          </em>
          .
        </h2>
        <p
          className="serif mx-auto mt-8 max-w-[600px] text-[clamp(17px,1.5vw+10px,22px)] italic leading-[1.5]"
          style={{ color: "#C8C0B0" }}
        >
          {t("landing.final.sub_new")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={FINAL_HREF}
            className="btn-primary"
            style={{
              padding: "16px 28px",
              fontSize: 15,
              background: "var(--persimmon)",
              color: "var(--paper-3)",
              boxShadow: "6px 6px 0 var(--saffron)",
            }}
          >
            {t("landing.final.cta_primary_new")}
            <ArrowIcon size={16} color="var(--paper-3)" />
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
          className="mono mt-10 flex flex-wrap items-center justify-center gap-4 border-t pt-6 text-[11px] tracking-[0.14em]"
          style={{
            borderColor: "rgba(247,242,230,0.2)",
            color: "#C8C0B0",
          }}
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
