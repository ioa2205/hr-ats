import { describe, it, expect } from "vitest";
import {
  CHORD_WINDOW_MS,
  initialChordState,
  matchShortcut,
  type KeyEvent,
} from "./shortcuts";

function ev(overrides: Partial<KeyEvent>): KeyEvent {
  return {
    key: "",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    inEditable: false,
    ...overrides,
  };
}

describe("matchShortcut", () => {
  it("fires palette on ⌘K even inside editable targets", () => {
    const result = matchShortcut(
      initialChordState(),
      ev({ key: "k", metaKey: true, inEditable: true }),
      0,
    );
    expect(result.matched?.id).toBe("palette");
    expect(result.nextChord.pending).toBeNull();
  });

  it("fires palette on Ctrl+K (non-Mac)", () => {
    const result = matchShortcut(initialChordState(), ev({ key: "k", ctrlKey: true }), 0);
    expect(result.matched?.id).toBe("palette");
  });

  it("fires cheatsheet on ?", () => {
    const result = matchShortcut(initialChordState(), ev({ key: "?" }), 0);
    expect(result.matched?.id).toBe("cheatsheet");
  });

  it("suppresses non-palette shortcuts while typing in an input", () => {
    const r1 = matchShortcut(initialChordState(), ev({ key: "?", inEditable: true }), 0);
    expect(r1.matched).toBeNull();

    const r2 = matchShortcut(initialChordState(), ev({ key: "g", inEditable: true }), 0);
    expect(r2.matched).toBeNull();
    expect(r2.nextChord.pending).toBeNull();
  });

  it("resolves g d chord within the window", () => {
    const s1 = matchShortcut(initialChordState(), ev({ key: "g" }), 0);
    expect(s1.matched).toBeNull();
    expect(s1.nextChord.pending).toBe("g");

    const s2 = matchShortcut(s1.nextChord, ev({ key: "d" }), 500);
    expect(s2.matched?.id).toBe("nav-dashboard");
    expect(s2.nextChord.pending).toBeNull();
  });

  it.each([
    ["c", "nav-companies"],
    ["u", "nav-users"],
    ["i", "nav-inbox"],
    ["a", "nav-audit"],
  ])("resolves g %s chord", (k, id) => {
    const s1 = matchShortcut(initialChordState(), ev({ key: "g" }), 0);
    const s2 = matchShortcut(s1.nextChord, ev({ key: k }), 100);
    expect(s2.matched?.id).toBe(id);
  });

  it("expires the chord after the window", () => {
    const s1 = matchShortcut(initialChordState(), ev({ key: "g" }), 0);
    const s2 = matchShortcut(s1.nextChord, ev({ key: "d" }), CHORD_WINDOW_MS + 50);
    expect(s2.matched).toBeNull();
    expect(s2.nextChord.pending).toBeNull();
  });

  it("breaks the chord when the second key is not a registered leaf", () => {
    const s1 = matchShortcut(initialChordState(), ev({ key: "g" }), 0);
    const s2 = matchShortcut(s1.nextChord, ev({ key: "z" }), 200);
    expect(s2.matched).toBeNull();
    expect(s2.nextChord.pending).toBeNull();
  });

  it("does not start a chord when g is pressed with a modifier", () => {
    const s1 = matchShortcut(initialChordState(), ev({ key: "g", metaKey: true }), 0);
    expect(s1.nextChord.pending).toBeNull();
  });
});
