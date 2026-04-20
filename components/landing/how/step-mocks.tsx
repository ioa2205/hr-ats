import { getT } from "@/lib/i18n/server";

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ padding: "5px 8px", border: "1px dashed var(--ink-4)" }}>
      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.12em" }}>
        {k}
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>
        {v}
      </div>
    </div>
  );
}

export async function StepMock1() {
  const { t } = await getT();
  return (
    <div
      style={{
        border: "1px solid var(--ink)",
        background: "var(--paper-3)",
        padding: 14,
        fontSize: 12,
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-3)", marginBottom: 6 }}
      >
        {t("landing.step1.kicker")}
      </div>
      <div className="serif" style={{ fontSize: 18, letterSpacing: "-0.015em", marginBottom: 8 }}>
        {t("landing.step1.role")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {["Figma", "SaaS", "5+", "RU+EN"].map((tag) => (
          <span
            key={tag}
            className="mono"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "var(--paper-2)",
              border: "1px solid var(--ink)",
              letterSpacing: "0.06em",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          padding: "6px 8px",
          background: "var(--ink)",
          color: "var(--paper-3)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: "0.04em",
        }}
      >
        → tezhr.uz/j/des-042
        <span style={{ marginLeft: "auto", color: "var(--persimmon)" }}>
          {t("landing.step1.copy")}
        </span>
      </div>
    </div>
  );
}

export async function StepMock2() {
  const { t } = await getT();
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--paper-3)", padding: 14 }}>
      <div
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-3)", marginBottom: 8 }}
      >
        {t("landing.step2.kicker")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          background: "var(--paper-2)",
          border: "1px solid var(--ink)",
          marginBottom: 8,
          fontSize: 11,
        }}
      >
        <span style={{ width: 8, height: 8, background: "var(--persimmon)" }} />
        {t("landing.step2.filename")}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-3)" }}>
          248 KB
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
        <Field k={t("landing.step2.field_name")} v={t("landing.step2.field_name_v")} />
        <Field k={t("landing.step2.field_exp")} v={t("landing.step2.field_exp_v")} />
        <Field k={t("landing.step2.field_langs")} v={t("landing.step2.field_langs_v")} />
        <Field k={t("landing.step2.field_skills")} v={t("landing.step2.field_skills_v")} />
      </div>
    </div>
  );
}

export async function StepMock3() {
  const { t } = await getT();
  const rows = [
    { n: "Диёра Р.", s: 94, tone: "var(--persimmon)" },
    { n: "Азиз К.", s: 87, tone: "var(--ikat)" },
    { n: "Мадина Ю.", s: 82, tone: "var(--ikat)" },
  ];
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--paper-3)", padding: 14 }}>
      <div
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-3)", marginBottom: 10 }}
      >
        {t("landing.step3.kicker")}
      </div>
      {rows.map((r, i) => (
        <div
          key={r.n}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: i < 2 ? 8 : 0,
            fontSize: 12,
            paddingBottom: i < 2 ? 6 : 0,
            borderBottom: i < 2 ? "1px dashed var(--ink-4)" : "none",
          }}
        >
          <span className="serif" style={{ color: "var(--ink-3)", fontSize: 14, width: 14 }}>
            {i + 1}
          </span>
          <span className="serif" style={{ flex: 1, fontSize: 14 }}>
            {r.n}
          </span>
          <div
            style={{
              flex: 1.5,
              height: 5,
              background: "var(--paper-2)",
              border: "1px solid var(--ink)",
              position: "relative",
            }}
          >
            <div style={{ height: "100%", width: `${r.s}%`, background: r.tone }} />
          </div>
          <span
            className="mono"
            style={{ fontWeight: 600, width: 22, textAlign: "right", color: "var(--ink)" }}
          >
            {r.s}
          </span>
        </div>
      ))}
    </div>
  );
}
