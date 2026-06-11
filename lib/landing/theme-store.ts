export type Theme = "light" | "dark";

/**
 * Theme preference for the public marketing surface. Kept separate from the
 * app shells (HR/operator): the landing defaults to light — its designed
 * default — and only flips when the visitor explicitly chooses dark. The
 * choice is persisted and applied to the `.tezhr-landing` root only, so it
 * never leaks into the authenticated app shells which manage their own theme.
 */
const STORAGE_KEY = "tezhr-landing-theme";
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

export function subscribeLandingTheme(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function getLandingThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getLandingThemeServerSnapshot(): Theme {
  return "light";
}

export function writeLandingTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // noop — private mode, quota, etc.
  }
  notify();
}
