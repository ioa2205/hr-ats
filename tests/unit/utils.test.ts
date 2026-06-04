import { describe, it, expect } from "vitest";
import { safeHttpUrl } from "@/lib/utils";

describe("safeHttpUrl — href scheme guard", () => {
  it("passes through http(s) URLs", () => {
    expect(safeHttpUrl("https://hh.uz/resume/abc123")).toBe("https://hh.uz/resume/abc123");
    expect(safeHttpUrl("http://example.com/x")).toBe("http://example.com/x");
  });

  it("rejects javascript: and data: schemes (XSS vectors)", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects malformed / empty input", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});
