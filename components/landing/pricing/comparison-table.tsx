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
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost" aria-expanded={open} style={{ minHeight: 40 }}>
        <span aria-hidden className="text-[var(--ikat)] transition-transform" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
          +
        </span>
        {open ? toggleClose : toggleOpen}
      </button>
      {open && (
        <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--rule)", background: "var(--paper-3)" }}>
          <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--paper-2)" }}>
                <th className="mono text-left" style={{ padding: "14px 20px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  {featureLabel}
                </th>
                <th className="mono text-left" style={{ padding: "14px 20px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  {trialLabel}
                </th>
                <th className="mono text-left" style={{ padding: "14px 20px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ikat)" }}>
                  {proLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} style={{ borderTop: i > 0 ? "1px solid var(--rule)" : 0 }}>
                  <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "var(--ink)", verticalAlign: "top" }}>
                    {r.label}
                    {r.note && (
                      <div className="mt-1 text-[11px]" style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                        {r.note}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--ink-3)", verticalAlign: "top" }}>{r.trial}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "var(--ikat)", verticalAlign: "top" }}>{r.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
