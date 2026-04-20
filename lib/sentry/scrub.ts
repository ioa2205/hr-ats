import type { ErrorEvent, Event } from "@sentry/nextjs";

// P2-17: strip PII from Sentry events before they leave the process. Runs in
// every Sentry.init beforeSend hook (server, edge, client).
//
// Matches any object key that contains one of these tokens (case-insensitive):
// email, phone, password, cv_text, authorization, cookie, turnstile, otp.

const SENSITIVE_KEY = /email|phone|password|cv_text|authorization|cookie|turnstile|otp/i;
const REDACTED = "[REDACTED]";

function scrubValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => scrubValue(v, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = scrubValue(v, seen);
    }
  }
  return out;
}

/**
 * Used as the `beforeSend` hook in Sentry configs. Strips recognised PII keys
 * anywhere in the event tree (request.headers, request.body, extra, tags,
 * breadcrumbs), plus always drops request.headers.authorization / cookies.
 *
 * Sentry's `beforeSend` signature requires `ErrorEvent`, but the underlying
 * shape is identical to `Event` for our purposes — we never add fields, only
 * scrub. Typed as `ErrorEvent` so the hook slots into `Sentry.init`.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.headers) {
    const headers = { ...event.request.headers } as Record<string, string>;
    delete headers.authorization;
    delete headers.Authorization;
    delete headers.cookie;
    delete headers.Cookie;
    event.request = { ...event.request, headers };
  }

  const seen = new WeakSet<object>();
  return scrubValue(event, seen) as ErrorEvent;
}

/** Test-only entry point that accepts any Event shape for scrubbing. */
export function scrubSentryEventForTest(event: Event): Event {
  return scrubSentryEvent(event as ErrorEvent);
}
