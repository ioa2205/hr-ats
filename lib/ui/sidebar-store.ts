/**
 * Persisted collapse state for the desktop navigation rail (HR + operator).
 * Mirrors the theme-store pattern: a tiny external store read through
 * `useSyncExternalStore` so the rail can render collapsed/expanded without a
 * hydration mismatch, and the choice survives reloads and cross-tab changes.
 */
const STORAGE_KEY = "tezhr-nav-collapsed";
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

export function subscribeSidebar(cb: () => void): () => void {
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

export function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getSidebarServerSnapshot(): boolean {
  return false;
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // noop — private mode, quota, etc.
  }
  notify();
}
