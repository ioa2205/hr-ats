import Link from "next/link";

export interface PriceCardProps {
  tag: string;
  tagBadge?: string;
  name: string;
  tagline: string;
  price: string;
  unit: string;
  features: string[];
  cta: string;
  ctaHref: string;
  note?: string;
  variant: "primary" | "secondary";
}

export function PriceCard({
  tag,
  tagBadge,
  name,
  tagline,
  price,
  unit,
  features,
  cta,
  ctaHref,
  note,
  variant,
}: PriceCardProps) {
  const isPrimary = variant === "primary";
  return (
    <div
      style={{
        position: "relative",
        padding: "36px 36px 32px",
        background: isPrimary ? "var(--ink)" : "var(--paper-3)",
        color: isPrimary ? "var(--paper-3)" : "var(--ink)",
        border: "1.5px solid var(--ink)",
        boxShadow: isPrimary ? "10px 10px 0 var(--persimmon)" : "10px 10px 0 var(--ink)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: isPrimary ? "var(--saffron)" : "var(--persimmon-2)",
          }}
        >
          {tag}
        </span>
        {tagBadge && (
          <span
            className="mono"
            style={{
              fontSize: 9,
              padding: "2px 8px",
              background: isPrimary ? "var(--saffron)" : "var(--ink)",
              color: isPrimary ? "var(--ink)" : "var(--paper-3)",
              letterSpacing: "0.18em",
            }}
          >
            {tagBadge}
          </span>
        )}
      </div>
      <div className="serif" style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.03em" }}>
        {name}
      </div>
      <div
        className="serif"
        style={{
          fontStyle: "italic",
          fontSize: 16,
          color: isPrimary ? "#C8C0B0" : "var(--ink-3)",
          marginTop: 6,
        }}
      >
        — {tagline}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          margin: "28px 0 20px",
          paddingBottom: 22,
          borderBottom: `1px solid ${isPrimary ? "rgba(247,242,230,0.22)" : "var(--ink)"}`,
        }}
      >
        <span
          className="serif"
          style={{
            fontSize: 110,
            lineHeight: 0.85,
            letterSpacing: "-0.05em",
            color: isPrimary ? "var(--paper-3)" : "var(--ink)",
          }}
        >
          {price}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            color: isPrimary ? "#C8C0B0" : "var(--ink-3)",
            marginBottom: 10,
          }}
        >
          {unit}
        </span>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {features.map((f, i) => (
          <li key={f} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.5 }}>
            <span
              className="serif"
              style={{
                color: isPrimary ? "var(--saffron)" : "var(--persimmon-2)",
                fontSize: 16,
                fontStyle: "italic",
                width: 22,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 32 }}>
        {ctaHref.startsWith("http") ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              padding: "14px 18px",
              background: isPrimary ? "var(--persimmon)" : "var(--ink)",
              color: "var(--paper-3)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-manrope),sans-serif",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "-0.005em",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            {cta}
          </a>
        ) : (
          <Link
            href={ctaHref}
            style={{
              display: "block",
              width: "100%",
              padding: "14px 18px",
              background: isPrimary ? "var(--persimmon)" : "var(--ink)",
              color: "var(--paper-3)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-manrope),sans-serif",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "-0.005em",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            {cta}
          </Link>
        )}
        {note && (
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: isPrimary ? "#C8C0B0" : "var(--ink-3)",
              textAlign: "center",
              fontStyle: "italic",
              fontFamily: "var(--font-instrument-serif),serif",
            }}
          >
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
