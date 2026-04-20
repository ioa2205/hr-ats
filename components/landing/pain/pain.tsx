import { getT } from "@/lib/i18n/server";

export async function PainSolution() {
  const { t } = await getT();
  const pain = [
    { t: t("landing.pain.pain1_t"), v: t("landing.pain.pain1_v"), u: t("landing.pain.pain1_u") },
    { t: t("landing.pain.pain2_t"), v: t("landing.pain.pain2_v"), u: t("landing.pain.pain2_u") },
    { t: t("landing.pain.pain3_t"), v: t("landing.pain.pain3_v"), u: t("landing.pain.pain3_u") },
    { t: t("landing.pain.pain4_t"), v: t("landing.pain.pain4_v"), u: t("landing.pain.pain4_u") },
  ];
  const gain = [
    { t: t("landing.pain.gain1_t"), v: t("landing.pain.gain1_v"), u: t("landing.pain.gain1_u") },
    { t: t("landing.pain.gain2_t"), v: t("landing.pain.gain2_v"), u: t("landing.pain.gain2_u") },
    { t: t("landing.pain.gain3_t"), v: t("landing.pain.gain3_v"), u: t("landing.pain.gain3_u") },
    { t: t("landing.pain.gain4_t"), v: t("landing.pain.gain4_v"), u: t("landing.pain.gain4_u") },
  ];

  return (
    <section
      className="paper-grain"
      style={{ position: "relative", padding: "120px 28px", background: "var(--paper-2)" }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 28,
            marginBottom: 20,
            borderBottom: "1px solid var(--ink)",
            paddingBottom: 14,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--persimmon-2)" }}
          >
            {t("landing.pain.section_tag")}
          </span>
          <span
            className="serif"
            style={{ fontSize: 20, fontStyle: "italic", color: "var(--ink-3)" }}
          >
            {t("landing.pain.section_title")}
          </span>
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
            }}
          >
            {t("landing.pain.section_meta")}
          </span>
        </div>

        <h2
          className="serif"
          style={{
            margin: "0 0 56px",
            fontSize: 82,
            lineHeight: 0.94,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
          }}
        >
          {t("landing.pain.heading_a")}{" "}
          <span style={{ position: "relative" }}>
            {t("landing.pain.heading_b")}
            <span
              style={{
                position: "absolute",
                left: -4,
                right: -4,
                top: "55%",
                height: 3,
                background: "var(--persimmon-2)",
                transform: "rotate(-4deg)",
              }}
            />
          </span>{" "}
          <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
            {t("landing.pain.heading_c")}
          </em>
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 0,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
              borderRight: "0",
              padding: "40px 36px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14,
                left: 28,
                padding: "4px 12px",
                background: "var(--paper-2)",
                border: "1.5px solid var(--ink)",
                fontFamily: "var(--font-jetbrains-mono),monospace",
                fontSize: 10,
                letterSpacing: "0.2em",
              }}
            >
              {t("landing.pain.badge_without")}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 28 }}>
              <span className="serif" style={{ fontSize: 54, lineHeight: 1, color: "var(--ink)" }}>
                {t("landing.pain.time_before")}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {t("landing.pain.time_before_v")}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {pain.map((p) => (
                <div
                  key={p.t + p.v}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 16,
                    alignItems: "baseline",
                    padding: "14px 0",
                    borderTop: "1px dashed var(--ink-4)",
                  }}
                >
                  <div>
                    <div
                      className="serif"
                      style={{
                        fontSize: 22,
                        color: "var(--ink-3)",
                        textDecoration: "line-through",
                        textDecorationColor: "var(--ink-4)",
                        textDecorationThickness: "1px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {p.t}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--ink-4)",
                        marginTop: 2,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {p.u}
                    </div>
                  </div>
                  <div
                    className="serif"
                    style={{ fontSize: 28, color: "var(--ink-3)", letterSpacing: "-0.02em" }}
                  >
                    {p.v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 28,
                padding: "12px 16px",
                background: "var(--paper-2)",
                border: "1px dashed var(--ink-4)",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--ink-3)",
                  marginBottom: 4,
                }}
              >
                {t("landing.pain.summary_label")}
              </div>
              <div className="serif" style={{ fontSize: 28, color: "var(--ink-3)" }}>
                {t("landing.pain.summary_without")}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              background: "var(--ink)",
              color: "var(--paper-3)",
              padding: "0 2px",
            }}
          >
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                padding: "20px 10px",
                fontFamily: "var(--font-instrument-serif),serif",
                fontStyle: "italic",
                fontSize: 28,
                letterSpacing: "-0.01em",
              }}
            >
              {t("landing.pain.vs")}
            </div>
          </div>

          <div
            style={{
              background: "var(--ink)",
              color: "var(--paper-3)",
              padding: "40px 36px",
              position: "relative",
              border: "1.5px solid var(--ink)",
              borderLeft: "0",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14,
                right: 28,
                padding: "4px 12px",
                background: "var(--persimmon)",
                color: "var(--paper-3)",
                fontFamily: "var(--font-jetbrains-mono),monospace",
                fontSize: 10,
                letterSpacing: "0.2em",
              }}
            >
              {t("landing.pain.badge_with")}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 28 }}>
              <span className="serif" style={{ fontSize: 54, lineHeight: 1 }}>
                {t("landing.pain.time_after")}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "#C8C0B0" }}>
                {t("landing.pain.time_after_v")}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {gain.map((p) => (
                <div
                  key={p.t + p.v}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 16,
                    alignItems: "baseline",
                    padding: "14px 0",
                    borderTop: "1px dashed rgba(247,242,230,0.22)",
                  }}
                >
                  <div>
                    <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                      {p.t}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "#C8C0B0",
                        marginTop: 2,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {p.u}
                    </div>
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 32,
                      color: "var(--saffron)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 28,
                padding: "12px 16px",
                background: "var(--night-2)",
                border: "1px dashed rgba(247,242,230,0.22)",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--saffron)",
                  marginBottom: 4,
                }}
              >
                {t("landing.pain.summary_label")}
              </div>
              <div className="serif" style={{ fontSize: 28 }}>
                {t("landing.pain.summary_with")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
