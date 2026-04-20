/**
 * Strips the limited markdown subset used in job descriptions
 * (mirrors the parser in `components/candidate/job-description.tsx`)
 * to a single plain-text string suitable for `<meta description>`,
 * Open Graph, and JSON-LD.
 *
 * Preserves block boundaries with a single space, collapses runs of
 * whitespace, and trims to `maxLength` if provided (cutting on a word
 * boundary and adding an ellipsis).
 */
export function markdownToPlainText(src: string, maxLength?: number): string {
  if (!src) return "";

  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    let line = raw.trim();
    if (!line) continue;

    line = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    out.push(line);
  }

  const flat = out.join(" ").replace(/\s+/g, " ").trim();
  if (!maxLength || flat.length <= maxLength) return flat;

  const sliced = flat.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return cut.trimEnd() + "…";
}
