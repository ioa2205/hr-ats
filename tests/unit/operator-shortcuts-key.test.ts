import { describe, expect, it } from "vitest";
import { initialChordState, matchShortcut } from "@/lib/operator/shortcuts";

describe("operator shortcut browser key normalization", () => {
  it("opens the cheatsheet for Shift+/", () => {
    const result = matchShortcut(
      initialChordState(),
      {
        key: "/",
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        inEditable: false,
      },
      0,
    );

    expect(result.matched?.id).toBe("cheatsheet");
  });
});
