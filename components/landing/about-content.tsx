"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/provider";
import { SIGNUP_HREF, TELEGRAM_URL } from "./shared";
import { Icon } from "./mockups";

export function AboutContent() {
  const { t } = useTranslation();

  const values = [
    {
      t: t("about.values.v1_t"),
      b: t("about.values.v1_b"),
    },
    {
      t: t("about.values.v2_t"),
      b: t("about.values.v2_b"),
    },
    {
      t: t("about.values.v3_t"),
      b: t("about.values.v3_b"),
    },
  ];

  return (
    <>
      {/* Masthead bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 28px",
          borderBottom: "1px solid var(--ink)",
          fontFamily: "var(--font-jetbrains-mono),monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--ink-2)",
          background: "var(--paper)",
        }}
      >
        <span>{t("about.kicker")}</span>
        <span>{t("about.meta")}</span>
      </div>

      {/* Hero title */}
      <section
        className="paper-grain"
        style={{ background: "var(--paper)", padding: "72px 28px 80px" }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <h1
            className="serif"
            style={{
              margin: 0,
              fontSize: 132,
              lineHeight: 0.9,
              letterSpacing: "-0.045em",
              fontWeight: 400,
              maxWidth: 1100,
            }}
          >
            {t("about.title_a")}{" "}
            <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
              {t("about.title_b")}
            </em>
          </h1>
          <p
            className="serif"
            style={{
              margin: "36px 0 0",
              fontStyle: "italic",
              fontSize: 22,
              color: "var(--ink-3)",
              lineHeight: 1.45,
              maxWidth: 720,
            }}
          >
            {t("about.subtitle")}
          </p>
        </div>
      </section>

      {/* Story section */}
      <section
        className="paper-grain"
        style={{
          background: "var(--paper-2)",
          padding: "100px 28px",
          borderTop: "1px solid var(--ink)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 28,
              marginBottom: 40,
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 14,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--persimmon-2)" }}
            >
              {t("about.story.kicker")}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 40,
              alignItems: "flex-start",
            }}
          >
            {[t("about.story.p1"), t("about.story.p2"), t("about.story.p3")].map(
              (para, i) => (
                <div key={i}>
                  <div
                    className="serif"
                    style={{
                      fontSize: 52,
                      lineHeight: 1,
                      color: "var(--persimmon-2)",
                      letterSpacing: "-0.04em",
                      marginBottom: 18,
                      fontStyle: "italic",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 17,
                      lineHeight: 1.6,
                      color: "var(--ink-2)",
                    }}
                  >
                    {para}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        className="paper-grain"
        style={{
          background: "var(--paper)",
          padding: "100px 28px",
          borderTop: "1px solid var(--ink)",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 28,
              marginBottom: 40,
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 14,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--persimmon-2)" }}
            >
              {t("about.values.kicker")}
            </span>
            <span
              className="serif"
              style={{ fontSize: 20, fontStyle: "italic", color: "var(--ink-3)" }}
            >
              — {t("about.values.title")}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 0,
              borderTop: "2px solid var(--ink)",
              borderBottom: "2px solid var(--ink)",
            }}
          >
            {values.map((v, i) => (
              <div
                key={v.t}
                style={{
                  padding: "32px 28px",
                  borderRight: i < 2 ? "1px solid var(--ink)" : "0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--ink-3)",
                  }}
                >
                  ✶ {String(i + 1).padStart(2, "0")}
                </div>
                <h3
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: 32,
                    lineHeight: 1.05,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {v.t}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "var(--ink-2)",
                  }}
                >
                  {v.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission (inverted) */}
      <section
        className="night-grain"
        style={{
          background: "var(--night)",
          color: "var(--paper-3)",
          padding: "120px 28px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="ikat-bg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--saffron)",
              marginBottom: 24,
            }}
          >
            {t("about.mission.kicker")}
          </div>
          <p
            className="serif"
            style={{
              margin: 0,
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontStyle: "italic",
              color: "var(--paper-3)",
            }}
          >
            “{t("about.mission.text")}”
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="paper-grain"
        style={{ background: "var(--paper)", padding: "80px 28px 100px" }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--persimmon-2)",
              marginBottom: 16,
            }}
          >
            {t("about.cta.kicker")}
          </div>
          <p
            className="serif"
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.3,
              fontStyle: "italic",
              color: "var(--ink-2)",
            }}
          >
            {t("about.cta.text")}
          </p>
          <div
            style={{
              marginTop: 36,
              display: "inline-flex",
              gap: 14,
            }}
          >
            <Link
              href={SIGNUP_HREF}
              className="btn-primary"
              style={{
                padding: "14px 24px",
                fontSize: 14,
                background: "var(--persimmon)",
                color: "var(--paper-3)",
                boxShadow: "5px 5px 0 var(--ink)",
              }}
            >
              {t("about.cta.primary")}
              <Icon.arrow size={14} color="var(--paper-3)" />
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "13px 22px",
                background: "transparent",
                color: "var(--ink)",
                border: "1.5px solid var(--ink)",
                cursor: "pointer",
                fontFamily: "var(--font-manrope),sans-serif",
                fontSize: 14,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              <Icon.telegram size={14} />
              {t("about.cta.secondary")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
