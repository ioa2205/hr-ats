import { getT } from "@/lib/i18n/server";

function MiniShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--rule)", background: "var(--paper-3)" }}>
      {children}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md px-2.5 py-1.5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono" style={{ color: "var(--ink-4)", fontSize: 9, letterSpacing: "0.1em" }}>
        {k}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
    </div>
  );
}

export async function StepMock1() {
  const { t } = await getT();
  return (
    <MiniShell>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 6 }}>
        {t("landing.step1.kicker")}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", marginBottom: 8 }}>
        {t("landing.step1.role")}
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {["Figma", "SaaS", "5+ yrs", "RU+EN"].map((tag) => (
          <span key={tag} className="lp-chip" style={{ fontSize: 9, padding: "2px 7px" }}>
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mono flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px]"
        style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)" }}
      >
        tezhr.uz/j/des-042
        <span style={{ marginLeft: "auto", fontWeight: 600 }}>{t("landing.step1.copy")}</span>
      </div>
    </MiniShell>
  );
}

export async function StepMock2() {
  const { t } = await getT();
  return (
    <MiniShell>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 8 }}>
        {t("landing.step2.kicker")}
      </div>
      <div
        className="mb-2.5 flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px]"
        style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden />
        {t("landing.step2.filename")}
        <span className="mono ml-auto" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          248 KB
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Field k={t("landing.step2.field_name")} v={t("landing.step2.field_name_v")} />
        <Field k={t("landing.step2.field_exp")} v={t("landing.step2.field_exp_v")} />
        <Field k={t("landing.step2.field_langs")} v={t("landing.step2.field_langs_v")} />
        <Field k={t("landing.step2.field_skills")} v={t("landing.step2.field_skills_v")} />
      </div>
    </MiniShell>
  );
}

export async function StepMock3() {
  const { t } = await getT();
  const rows = [
    { n: "Диёра Р.", s: 94, top: true },
    { n: "Азиз К.", s: 87, top: false },
    { n: "Мадина Ю.", s: 82, top: false },
  ];
  return (
    <MiniShell>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 10 }}>
        {t("landing.step3.kicker")}
      </div>
      {rows.map((r, i) => (
        <div
          key={r.n}
          className="flex items-center gap-2.5 text-[12px]"
          style={{ padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--rule)" : "none" }}
        >
          <span className="mono" style={{ color: "var(--ink-4)", width: 14 }}>
            {i + 1}
          </span>
          <span className="flex-1 font-semibold">{r.n}</span>
          <div className="flex-[1.4]" style={{ height: 6, borderRadius: 999, background: "var(--paper-strong)", overflow: "hidden" }} aria-hidden>
            <div style={{ height: "100%", width: `${r.s}%`, background: r.top ? "var(--ikat)" : "var(--rule-strong)", borderRadius: 999 }} />
          </div>
          <span className="mono" style={{ fontWeight: 700, width: 22, textAlign: "right" }}>
            {r.s}
          </span>
        </div>
      ))}
    </MiniShell>
  );
}
