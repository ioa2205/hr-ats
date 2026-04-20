import { describe, expect, it } from "vitest";
import {
  detectLocaleParity,
  extractVariables,
  renderTemplate,
  unknownVariables,
} from "@/lib/templates/variables";

describe("extractVariables", () => {
  it("collects unique lowercase tokens", () => {
    expect(extractVariables("Hi {Name}, role {position}, {NAME} again.")).toEqual([
      "name",
      "position",
    ]);
  });

  it("returns empty array when no tokens are present", () => {
    expect(extractVariables("Plain text")).toEqual([]);
  });
});

describe("unknownVariables", () => {
  it("flags anything outside the allow-list", () => {
    expect(
      unknownVariables("Hello {name}, {position}, {foo}, {bar}"),
    ).toEqual(["foo", "bar"]);
  });
});

describe("detectLocaleParity", () => {
  it("returns all-false when all locales use the same variables", () => {
    const parity = detectLocaleParity({
      ru: "{name} {position}",
      uz: "{name} {position}",
      en: "{name} {position}",
    });
    expect(parity).toEqual({ ru: false, uz: false, en: false });
  });

  it("flags locales missing a variable present elsewhere", () => {
    const parity = detectLocaleParity({
      ru: "{name} {interview_link}",
      uz: "{name}",
      en: "{name} {interview_link}",
    });
    expect(parity).toEqual({ ru: false, uz: true, en: false });
  });
});

describe("renderTemplate", () => {
  it("substitutes values for known tokens", () => {
    expect(
      renderTemplate("Hi {name}, for {position}!", {
        name: "Aziza",
        position: "ML Engineer",
      }),
    ).toBe("Hi Aziza, for ML Engineer!");
  });

  it("leaves unknown tokens verbatim", () => {
    expect(renderTemplate("Hi {name}, {foo}!", { name: "A" })).toBe("Hi A, {foo}!");
  });
});
