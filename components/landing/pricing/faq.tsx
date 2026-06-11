interface Item {
  q: string;
  a: string;
}

export function FAQ({ items, heading }: { items: Item[]; heading: string }) {
  return (
    <div className="mt-16">
      <h3 className="lp-h2" style={{ margin: "0 0 20px", fontSize: "clamp(26px, 3vw + 8px, 38px)" }}>
        {heading}
      </h3>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--rule)", background: "var(--paper-3)" }}>
        {items.map((item, i) => (
          <details key={`${i}-${item.q}`} className="group" style={{ borderTop: i === 0 ? "0" : "1px solid var(--rule)" }}>
            <summary
              className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 text-[clamp(16px,1vw+10px,19px)] font-semibold leading-[1.3] tracking-[-0.01em]"
              style={{ color: "var(--ink)" }}
            >
              <span>{item.q}</span>
              <span aria-hidden className="mt-0.5 text-[20px] transition-transform group-open:rotate-45" style={{ color: "var(--ikat)", flexShrink: 0 }}>
                +
              </span>
            </summary>
            <div className="text-[15px] leading-[1.65]" style={{ padding: "0 20px 20px", color: "var(--ink-3)" }}>
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
