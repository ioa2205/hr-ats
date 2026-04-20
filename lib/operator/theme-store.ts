export type Theme = "light" | "dark";

const STORAGE_KEY = "tezhr-operator-theme";
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

export function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  const mq =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const onMq = () => cb();

  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  mq?.addEventListener("change", onMq);

  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    mq?.removeEventListener("change", onMq);
  };
}

export function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getThemeServerSnapshot(): Theme {
  return "light";
}

export function writeTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // noop — private mode, quota, etc.
  }
  notify();
}
