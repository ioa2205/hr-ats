import { describe, it, expect } from "vitest";
import { cn, formatPhone, sanitize, slugify } from "@/lib/utils";

describe("utils", () => {
  it("cn merges class names", () => {
    expect(cn("a", "b", false && "c")).toBe("a b");
  });

  it("formatPhone formats Uzbek numbers", () => {
    expect(formatPhone("998901234567")).toBe("+998 90 123 45 67");
  });

  it("sanitize escapes HTML entities", () => {
    expect(sanitize("<script>")).toBe("&lt;script&gt;");
  });

  it("slugify produces URL-safe strings", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
