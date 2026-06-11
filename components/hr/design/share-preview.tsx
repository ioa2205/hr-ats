interface SharePreviewProps {
  title: string;
  company: string;
  logoUrl: string | null;
  appliedCount: number;
  locales: string[];
  eyebrow: string;
  appliedLabel: string;
}

/**
 * HTML replica of the Open Graph image rendered for `/apply/<token>`.
 * Visually mirrors `app/apply/[token]/opengraph-image.tsx` so HR can preview
 * exactly what a Telegram / WhatsApp / LinkedIn unfurl will show.
 *
 * The real OG image is a fixed light-mode PNG, so this preview uses the same
 * fixed palette (not theme tokens) — the unfurl looks identical regardless of
 * the recruiter's app theme.
 */
const COLOR_BONE = "#f6f3ec";
const COLOR_INK = "#171a1f";
const COLOR_INK_3 = "#4f5963";
const COLOR_INK_4 = "#65707a";
const COLOR_INK_5 = "#8a929a";
const COLOR_RULE = "#d7d1c5";
const COLOR_RULE_2 = "#c7c1b4";
const COLOR_LAPIS = "#0b57a3";

export function SharePreview({
  title,
  company,
  logoUrl,
  appliedCount,
  locales,
  eyebrow,
  appliedLabel,
}: SharePreviewProps) {
  const len = title.length;
  const titleSize = len <= 28 ? 44 : len <= 44 ? 36 : len <= 64 ? 30 : len <= 90 ? 25 : 21;
  const logoLetter = company.trim().slice(0, 1).toUpperCase() || "•";
  const localesLabel = locales.join(" · ");

  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] border"
      style={{ aspectRatio: "1200 / 630", background: COLOR_BONE, borderColor: COLOR_RULE }}
    >
      <div className="absolute inset-0 flex flex-col p-[5%]">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-[26px] w-[26px] rounded-[4px] border object-cover"
              style={{ borderColor: COLOR_RULE }}
            />
          ) : (
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[12px] font-bold"
              style={{ background: COLOR_LAPIS, color: "#ffffff" }}
            >
              {logoLetter}
            </div>
          )}
          <div className="text-[11px] font-semibold tracking-[-0.005em]" style={{ color: COLOR_INK_3 }}>
            {company}
          </div>
        </div>

        <div
          className="mt-3 font-[var(--font-mono)] text-[8.5px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: COLOR_INK_4 }}
        >
          {eyebrow}
        </div>

        <div
          className="mt-1.5 line-clamp-3 font-bold leading-[1.1] tracking-[-0.025em]"
          style={{ fontSize: `${titleSize}px`, color: COLOR_INK }}
        >
          {title}
        </div>

        <div className="flex-1" />

        <div className="flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            {appliedCount > 0 && (
              <span
                className="rounded-[3px] border px-1.5 py-[2px] font-[var(--font-mono)] text-[8px] font-medium tracking-[0.08em]"
                style={{ color: COLOR_INK_3, borderColor: COLOR_RULE_2 }}
              >
                {appliedLabel}
              </span>
            )}
            <span
              className="rounded-[3px] border px-1.5 py-[2px] font-[var(--font-mono)] text-[8px] font-medium tracking-[0.12em]"
              style={{ color: COLOR_INK_3, borderColor: COLOR_RULE_2 }}
            >
              {localesLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-[1px]" style={{ color: COLOR_INK_3 }}>
            <span className="text-[11px] font-bold">TezHR</span>
            <span className="text-[6.5px] font-semibold tracking-[0.12em]" style={{ color: COLOR_INK_5 }}>
              .uz
            </span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-[3px] w-[70px]" style={{ background: COLOR_LAPIS }} />
    </div>
  );
}
