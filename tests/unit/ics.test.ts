import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine } from "@/lib/calendar/ics";

describe("escapeIcsText", () => {
  it("escapes commas, semicolons and backslashes", () => {
    expect(escapeIcsText("a, b; c\\d")).toBe("a\\, b\\; c\\\\d");
  });
  it("converts newlines to literal \\n", () => {
    expect(escapeIcsText("line1\nline2\r\nline3")).toBe("line1\\nline2\\nline3");
  });
});

describe("foldIcsLine", () => {
  it("returns short lines unchanged", () => {
    expect(foldIcsLine("SHORT")).toBe("SHORT");
  });
  it("folds long lines at 73 chars with leading space on continuation", () => {
    const long = "x".repeat(150);
    const folded = foldIcsLine(long);
    expect(folded.split("\r\n").length).toBeGreaterThan(1);
    const lines = folded.split("\r\n");
    expect(lines[0]).toHaveLength(73);
    expect(lines[1].startsWith(" ")).toBe(true);
  });
});

describe("buildIcs", () => {
  const fixed = new Date(Date.UTC(2026, 3, 22, 5, 0, 0));
  const event = {
    uid: "interview-abc@tezhr.uz",
    startAt: fixed,
    endAt: new Date(fixed.getTime() + 30 * 60_000),
    summary: "ML Engineer — Tezsoft",
    description: "Looking forward to chatting!",
    location: "Google Meet",
    organizerName: "Tezsoft",
    generatedAt: fixed,
  };

  it("opens with VCALENDAR + VEVENT and closes both", () => {
    const ics = buildIcs(event);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("emits required RFC 5545 fields", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//TezHR//Interview Scheduling//EN");
    expect(ics).toContain(`UID:${event.uid}`);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z/);
  });

  it("emits UTC times in YYYYMMDDTHHMMSSZ shape", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("DTSTART:20260422T050000Z");
    expect(ics).toContain("DTEND:20260422T053000Z");
  });

  it("escapes commas in the summary", () => {
    const ics = buildIcs({ ...event, summary: "ML, Engineer" });
    expect(ics).toContain("SUMMARY:ML\\, Engineer");
  });

  it("uses CRLF line endings throughout", () => {
    const ics = buildIcs(event);
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(8);
    expect(ics.includes("\n") && !ics.includes("\r\n\n")).toBe(true);
  });

  it("includes ORGANIZER mailto when organizerEmail is provided", () => {
    const ics = buildIcs({ ...event, organizerEmail: "hr@tezsoft.uz" });
    expect(ics).toContain("ORGANIZER;CN=Tezsoft:mailto:hr@tezsoft.uz");
  });

  it("omits optional DESCRIPTION when blank", () => {
    const ics = buildIcs({ ...event, description: "" });
    expect(ics).not.toContain("DESCRIPTION:");
  });
});
