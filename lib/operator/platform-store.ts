/**
 * Platform detection as a React-compatible external store. Platform is
 * immutable across a session, so `subscribe` is a no-op.
 */

export function subscribePlatform(): () => void {
  return () => {
    /* noop — platform does not change */
  };
}

export function getIsMacSnapshot(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad/i.test(ua);
}

export function getIsMacServerSnapshot(): boolean {
  return false;
}
