import { getT } from "@/lib/i18n/server";

function TickerStar() {
  return (
    <span
      style={{
        fontFamily: "var(--font-jetbrains-mono),monospace",
        fontStyle: "normal",
        fontSize: 14,
        letterSpacing: "0.2em",
        color: "var(--saffron)",
      }}
    >
      ★
    </span>
  );
}

export async function TickerBand() {
  const { t } = await getT();
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--paper-3)",
        padding: "18px 0",
        borderTop: "1.5px solid var(--ink)",
        borderBottom: "1.5px solid var(--ink)",
      }}
    >
      <div className="ticker-band">
        <div className="ticker-track serif" style={{ fontSize: 24, fontStyle: "italic" }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 44 }}>
              <span>{t("landing.ticker.fast_local")}</span>
              <TickerStar />
              <span>{t("landing.ticker.fast_uz")}</span>
              <TickerStar />
              <span>{t("landing.ticker.faster")}</span>
              <TickerStar />
              <span>RU · UZ · EN</span>
              <TickerStar />
              <span>{t("landing.ticker.made_in")}</span>
              <TickerStar />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
