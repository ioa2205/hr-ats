import { describe, it, expect } from "vitest";
import { markdownToPlainText } from "@/lib/markdown/to-plain-text";

describe("markdownToPlainText", () => {
  it("returns empty string for empty input", () => {
    expect(markdownToPlainText("")).toBe("");
  });

  it("strips heading markers", () => {
    expect(markdownToPlainText("# Big\n## Small\n### Tiny")).toBe("Big Small Tiny");
  });

  it("strips bullet, numbered, and asterisk lists", () => {
    const src = "- one\n- two\n1. first\n2. second\n* third";
    expect(markdownToPlainText(src)).toBe("one two first second third");
  });

  it("strips bold and italic emphasis", () => {
    expect(markdownToPlainText("**bold** and _italic_ and `code`")).toBe(
      "bold and italic and code",
    );
  });

  it("flattens link syntax to label only", () => {
    expect(markdownToPlainText("see [docs](https://example.com) here")).toBe(
      "see docs here",
    );
  });

  it("collapses runs of whitespace and trims", () => {
    expect(markdownToPlainText("  multi   space\n\n\n  here  ")).toBe(
      "multi space here",
    );
  });

  it("respects maxLength and cuts on a word boundary with ellipsis", () => {
    const out = markdownToPlainText("alpha beta gamma delta epsilon zeta", 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
    expect(out).toBe("alpha beta gamma…");
  });

  it("does not append ellipsis when input is shorter than maxLength", () => {
    expect(markdownToPlainText("short", 100)).toBe("short");
  });

  it("handles cyrillic content", () => {
    expect(markdownToPlainText("# Москва\n- Узбекистан\n**жирный**")).toBe(
      "Москва Узбекистан жирный",
    );
  });
});
