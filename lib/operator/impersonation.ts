export const IMPERSONATION_MAX_MS = 60 * 60 * 1000; // 60 minutes
export const IMPERSONATION_WARN_AT_MS = 55 * 60 * 1000; // 55 minutes

/**
 * Pure predicate — extracted to avoid calling Date.now() in the body of an
 * async Server Component (flagged as an impure call by react-hooks/purity).
 */
export function isSessionStale(startedAtIso: string, nowMs: number): boolean {
  const started = Date.parse(startedAtIso);
  return Number.isFinite(started) && nowMs - started >= IMPERSONATION_MAX_MS;
}

export type ImpersonationState = "active" | "warning" | "expired";

export function elapsedMs(startedAtIso: string, nowMs: number): number {
  const started = Date.parse(startedAtIso);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, nowMs - started);
}

export function impersonationState(elapsed: number): ImpersonationState {
  if (elapsed >= IMPERSONATION_MAX_MS) return "expired";
  if (elapsed >= IMPERSONATION_WARN_AT_MS) return "warning";
  return "active";
}

export function remainingMs(elapsed: number): number {
  return Math.max(0, IMPERSONATION_MAX_MS - elapsed);
}

/**
 * Compact "14m" / "59m 23s" formatter for the banner.
 */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Formatter for the countdown ("14:32").
 */
export function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
