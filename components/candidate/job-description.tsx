import { Fragment, type ReactNode } from "react";

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    const bulletMatch = /^[-*•]\s+/.exec(trimmed);
    if (bulletMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = /^[-*•]\s+(.*)$/.exec(cur);
        if (!m) break;
        items.push(m[1].trim());
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+/.exec(trimmed);
    if (numberedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = /^\d+[.)]\s+(.*)$/.exec(cur);
        if (!m) break;
        items.push(m[1].trim());
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      const curTrim = cur.trim();
      if (!curTrim) break;
      if (/^(#{1,3}\s|[-*•]\s|\d+[.)]\s)/.test(curTrim)) break;
      paragraphLines.push(curTrim);
      i++;
    }
    if (paragraphLines.length) {
      blocks.push({ kind: "p", text: paragraphLines.join(" ") });
    }
  }

  return blocks;
}

function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <strong key={`b${key++}`} className="font-semibold">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : <>{out}</>;
}

interface JobDescriptionProps {
  text: string;
  className?: string;
}

export function JobDescription({ text, className = "" }: JobDescriptionProps) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        const isFirst = idx === 0;
        if (block.kind === "h2") {
          return (
            <h2
              key={idx}
              className={`text-ink text-[17px] font-bold leading-[1.3] tracking-[-0.01em] ${
                isFirst ? "mb-2" : "mb-2 mt-6"
              }`}
            >
              {renderInline(block.text)}
            </h2>
          );
        }
        if (block.kind === "h3") {
          return (
            <h3
              key={idx}
              className={`text-ink text-[15px] font-semibold leading-[1.3] tracking-[-0.005em] ${
                isFirst ? "mb-2" : "mb-2 mt-5"
              }`}
            >
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul
              key={idx}
              className={`text-ink-2 space-y-1.5 text-[14.5px] leading-[1.65] ${
                isFirst ? "" : "mt-2"
              }`}
            >
              {block.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="bg-ink-5 mt-[9px] h-1 w-1 shrink-0 rounded-full"
                  />
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol
              key={idx}
              className={`text-ink-2 space-y-1.5 text-[14.5px] leading-[1.65] ${
                isFirst ? "" : "mt-2"
              }`}
            >
              {block.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span
                    className="text-ink-4 mt-[2px] min-w-[1.25em] shrink-0 text-[12.5px] font-semibold tabular-nums"
                    aria-hidden
                  >
                    {j + 1}.
                  </span>
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <Fragment key={idx}>
            <p
              className={`text-ink-2 text-[14.5px] leading-[1.7] ${isFirst ? "" : "mt-3"}`}
            >
              {renderInline(block.text)}
            </p>
          </Fragment>
        );
      })}
    </div>
  );
}
