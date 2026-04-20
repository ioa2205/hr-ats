"use client";

import { useState } from "react";

interface Row {
  label: string;
  trial: string;
  pro: string;
  note?: string;
}

export function ComparisonTable({
  rows,
  trialLabel,
  proLabel,
  featureLabel,
  toggleOpen,
  toggleClose,
}: {
  rows: Row[];
  trialLabel: string;
  proLabel: string;
  featureLabel: string;
  toggleOpen: string;
  toggleClose: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-12">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 border py-2.5 pl-4 pr-5 text-[13px] font-medium"
        aria-expanded={open}
        style={{ borderColor: "var(--ink)" }}
      >
        <span
          aria-hidden
          className="inline-block text-[var(--persimmon-2)] transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
        {open ? toggleClose : toggleOpen}
      </button>
      {open && (
        <div
          className="mt-6 overflow-x-auto"
          style={{ border: "1.5px solid var(--ink)", background: "var(--paper-3)" }}
        >
          <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--ink)", color: "var(--paper-3)" }}>
                <th
                  className="mono text-left tracking-[0.14em]"
                  style={{ padding: "14px 20px", fontSize: 10 }}
                >
                  {featureLabel}
                </th>
                <th
                  className="mono text-left tracking-[0.14em]"
                  style={{ padding: "14px 20px", fontSize: 10 }}
                >
                  {trialLabel}
                </th>
                <th
                  className="mono text-left tracking-[0.14em]"
                  style={{
                    padding: "14px 20px",
                    fontSize: 10,
                    color: "var(--saffron)",
                  }}
                >
                  {proLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.label}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--ink-4)" : 0,
                  }}
                >
                  <td
                    className="serif"
                    style={{
                      padding: "14px 20px",
                      fontSize: 15,
                      color: "var(--ink)",
                      verticalAlign: "top",
                    }}
                  >
                    {r.label}
                    {r.note && (
                      <div
                        className="mt-1 text-[11px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {r.note}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "var(--ink-2)",
                      verticalAlign: "top",
                    }}
                  >
                    {r.trial}
                  </td>
                  <td
                    className="serif italic"
                    style={{
                      padding: "14px 20px",
                      fontSize: 15,
                      color: "var(--persimmon-2)",
                      verticalAlign: "top",
                    }}
                  >
                    {r.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
