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
 * Visually mirrors `app/apply/[token]/opengraph-image.tsx` so HR can
 * preview exactly what a Telegram / WhatsApp / LinkedIn unfurl will show.
 *
 * Renders at the OG aspect ratio (1200×630) and scales responsively via CSS
 * — no iframe or screenshot needed.
 */
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
  const titleSize =
    len <= 28 ? 44 : len <= 44 ? 36 : len <= 64 ? 30 : len <= 90 ? 25 : 21;
  const logoLetter = company.trim().slice(0, 1).toUpperCase() || "•";
  const localesLabel = locales.join(" · ");

  return (
    <div
      className="border-rule shadow-tez-1 relative w-full overflow-hidden rounded-[6px] border bg-bone"
      style={{ aspectRatio: "1200 / 630" }}
    >
      <div className="absolute inset-0 flex flex-col p-[5%]">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="border-rule h-[26px] w-[26px] rounded-[4px] border object-cover"
            />
          ) : (
            <div className="bg-ink text-paper flex h-[26px] w-[26px] items-center justify-center rounded-[4px] text-[12px] font-bold">
              {logoLetter}
            </div>
          )}
          <div className="text-ink-3 text-[11px] font-semibold tracking-[-0.005em]">
            {company}
          </div>
        </div>

        <div
          className="text-ink-4 mt-3 text-[8.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {eyebrow}
        </div>

        <div
          className="text-ink mt-1.5 line-clamp-3 font-bold leading-[1.1] tracking-[-0.025em]"
          style={{ fontSize: `${titleSize}px` }}
        >
          {title}
        </div>

        <div className="flex-1" />

        <div className="flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            {appliedCount > 0 && (
              <span
                className="border-rule-2 text-ink-3 rounded-[3px] border px-1.5 py-[2px] text-[8px] font-medium tracking-[0.08em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {appliedLabel}
              </span>
            )}
            <span
              className="border-rule-2 text-ink-3 rounded-[3px] border px-1.5 py-[2px] text-[8px] font-medium tracking-[0.12em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {localesLabel}
            </span>
          </div>
          <div className="text-ink-3 flex items-baseline gap-[1px]">
            <span className="text-[11px] font-bold">TezHR</span>
            <span className="text-ink-5 text-[6.5px] font-semibold tracking-[0.12em]">
              .uz
            </span>
          </div>
        </div>
      </div>
      <div className="bg-persimmon absolute bottom-0 left-0 h-[3px] w-[70px]" />
    </div>
  );
}
