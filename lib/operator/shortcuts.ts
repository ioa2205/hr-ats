import type { TranslationKey } from "@/lib/i18n/types";

export type ShortcutAction =
  | { kind: "open-palette" }
  | { kind: "toggle-cheatsheet" }
  | { kind: "navigate"; href: string };

export interface Shortcut {
  id: string;
  display: { mac: string; other: string };
  labelKey: TranslationKey;
  groupKey: TranslationKey;
  action: ShortcutAction;
}

export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: "palette",
    display: { mac: "⌘K", other: "Ctrl+K" },
    labelKey: "operator.shortcuts.palette",
    groupKey: "operator.shortcuts.group.global",
    action: { kind: "open-palette" },
  },
  {
    id: "cheatsheet",
    display: { mac: "?", other: "?" },
    labelKey: "operator.shortcuts.cheatsheet",
    groupKey: "operator.shortcuts.group.global",
    action: { kind: "toggle-cheatsheet" },
  },
  {
    id: "nav-dashboard",
    display: { mac: "g d", other: "g d" },
    labelKey: "operator.shortcuts.nav_dashboard",
    groupKey: "operator.shortcuts.group.nav",
    action: { kind: "navigate", href: "/operator" },
  },
  {
    id: "nav-companies",
    display: { mac: "g c", other: "g c" },
    labelKey: "operator.shortcuts.nav_companies",
    groupKey: "operator.shortcuts.group.nav",
    action: { kind: "navigate", href: "/operator/companies" },
  },
  {
    id: "nav-users",
    display: { mac: "g u", other: "g u" },
    labelKey: "operator.shortcuts.nav_users",
    groupKey: "operator.shortcuts.group.nav",
    action: { kind: "navigate", href: "/operator/users" },
  },
  {
    id: "nav-inbox",
    display: { mac: "g i", other: "g i" },
    labelKey: "operator.shortcuts.nav_inbox",
    groupKey: "operator.shortcuts.group.nav",
    action: { kind: "navigate", href: "/operator/inbox" },
  },
  {
    id: "nav-audit",
    display: { mac: "g a", other: "g a" },
    labelKey: "operator.shortcuts.nav_audit",
    groupKey: "operator.shortcuts.group.nav",
    action: { kind: "navigate", href: "/operator/audit" },
  },
] as const;

export interface ChordState {
  pending: "g" | null;
  pendingAt: number;
}

export const CHORD_WINDOW_MS = 1000;

export function initialChordState(): ChordState {
  return { pending: null, pendingAt: 0 };
}

export interface KeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** True when the event target is an editable element — chord keys are ignored */
  inEditable: boolean;
}

export interface MatchResult {
  nextChord: ChordState;
  matched: Shortcut | null;
}

function shortcutById(id: string): Shortcut {
  const s = SHORTCUTS.find((x) => x.id === id);
  // Unreachable: ids are string literals from SHORTCUTS above.
  if (!s) throw new Error(`Unknown shortcut id: ${id}`);
  return s;
}

/**
 * Pure resolver. Given the current chord state and a keyboard event, decide
 * whether a shortcut fires. No DOM side effects — the caller is responsible
 * for running the matched action and storing `nextChord`.
 */
export function matchShortcut(state: ChordState, event: KeyEvent, nowMs: number): MatchResult {
  const chord =
    state.pending && nowMs - state.pendingAt > CHORD_WINDOW_MS ? initialChordState() : state;

  if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
    return { nextChord: initialChordState(), matched: shortcutById("palette") };
  }

  if (event.inEditable) {
    return { nextChord: chord, matched: null };
  }

  if (event.key === "?") {
    return { nextChord: initialChordState(), matched: shortcutById("cheatsheet") };
  }

  if (
    !chord.pending &&
    event.key === "g" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    return { nextChord: { pending: "g", pendingAt: nowMs }, matched: null };
  }

  if (chord.pending === "g") {
    const idMap: Record<string, string> = {
      d: "nav-dashboard",
      c: "nav-companies",
      u: "nav-users",
      i: "nav-inbox",
      a: "nav-audit",
    };
    const targetId = idMap[event.key.toLowerCase()];
    if (targetId) {
      return { nextChord: initialChordState(), matched: shortcutById(targetId) };
    }
    return { nextChord: initialChordState(), matched: null };
  }

  return { nextChord: chord, matched: null };
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad/i.test(ua);
}
