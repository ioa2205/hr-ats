interface Item {
  q: string;
  a: string;
}

export function FAQ({ items, heading }: { items: Item[]; heading: string }) {
  return (
    <div className="mt-14">
      <h3
        className="serif"
        style={{
          margin: "0 0 20px",
          fontSize: "clamp(28px, 3vw + 10px, 40px)",
          letterSpacing: "-0.025em",
        }}
      >
        {heading}
      </h3>
      <div
        style={{
          borderTop: "1.5px solid var(--ink)",
          borderBottom: "1.5px solid var(--ink)",
        }}
      >
        {items.map((item, i) => (
          <details
            key={`${i}-${item.q}`}
            className="group"
            style={{ borderTop: "1px solid var(--ink-4)" }}
          >
            <summary
              className="serif flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-[clamp(17px,1.2vw+10px,20px)] leading-[1.3] tracking-[-0.015em]"
              style={{ padding: "18px 6px" }}
            >
              <span>{item.q}</span>
              <span
                aria-hidden
                className="mono mt-1 text-[18px] transition-transform group-open:rotate-45"
                style={{ color: "var(--persimmon-2)", flexShrink: 0 }}
              >
                +
              </span>
            </summary>
            <div
              className="text-[15px] leading-[1.65]"
              style={{ padding: "0 6px 20px", color: "var(--ink-2)" }}
            >
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
