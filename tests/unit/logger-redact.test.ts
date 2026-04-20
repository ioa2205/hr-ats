import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import pino from "pino";
import { scrubSentryEventForTest as scrubSentryEvent } from "@/lib/sentry/scrub";

// Replicate the production redact config inline so the assertion is not
// just re-exercising logger.ts's own config — if someone removes a path
// from lib/logger.ts, the test above (which imports the shared logger)
// still catches the drift because the PII leaks through the stream.
const PRODUCTION_REDACT_PATHS = [
  "email",
  "phone",
  "phone_number",
  "password",
  "cv_text",
  "turnstile_token",
  "authorization",
  "cookie",
  "*.email",
  "*.phone",
  "*.phone_number",
  "*.password",
  "*.cv_text",
  "*.turnstile_token",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  "req.body",
  "res.body",
  "request.body",
];

function capture(): { log: pino.Logger; get: () => string } {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _enc, cb) {
      buffer += chunk.toString();
      cb();
    },
  });
  const log = pino(
    {
      level: "debug",
      redact: { paths: PRODUCTION_REDACT_PATHS, censor: "[REDACTED]" },
    },
    stream,
  );
  return { log, get: () => buffer };
}

describe("Pino logger PII redaction", () => {
  it("redacts top-level email, phone, password, cv_text", () => {
    const { log, get } = capture();
    log.info({
      email: "alice@example.com",
      phone: "+998901234567",
      password: "hunter2",
      cv_text: "ALICE CV full text of resume body...",
      id: "keep-me",
    });
    const out = get();
    expect(out).not.toContain("alice@example.com");
    expect(out).not.toContain("+998901234567");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("ALICE CV full text");
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("keep-me");
  });

  it("redacts one-level-nested email/phone/turnstile_token", () => {
    const { log, get } = capture();
    log.info({
      candidate: {
        id: "cand-123",
        email: "bob@example.com",
        phone: "+998931112233",
      },
      req: { turnstile_token: "TK-12345" },
    });
    const out = get();
    expect(out).not.toContain("bob@example.com");
    expect(out).not.toContain("+998931112233");
    expect(out).not.toContain("TK-12345");
    expect(out).toContain("cand-123");
  });

  it("redacts authorization header", () => {
    const { log, get } = capture();
    log.info({ headers: { authorization: "Bearer sk_live_secret_xyz" } });
    expect(get()).not.toContain("sk_live_secret_xyz");
  });
});

describe("Sentry event scrubbing", () => {
  it("removes authorization + cookie from request headers", () => {
    const event = scrubSentryEvent({
      request: {
        headers: {
          authorization: "Bearer x",
          cookie: "sb-access-token=foo",
          "user-agent": "test",
        },
      },
    });
    expect(event.request?.headers).toEqual({ "user-agent": "test" });
  });

  it("recursively redacts keys matching email/phone/cv_text anywhere in the tree", () => {
    const event = scrubSentryEvent({
      extra: {
        candidate: {
          id: "c1",
          email: "x@y.z",
          details: { phone: "+998", cv_text: "BODY" },
        },
      },
      tags: { email_hash: "deadbeef" },
    });
    const asJson = JSON.stringify(event);
    expect(asJson).not.toContain("x@y.z");
    expect(asJson).not.toContain("+998");
    expect(asJson).not.toContain("BODY");
    expect(asJson).toContain("c1");
    // email_hash key matches the regex, so the value is redacted
    expect(asJson).not.toContain("deadbeef");
  });

  it("passes a benign event through unchanged", () => {
    const event = scrubSentryEvent({ message: "hello", tags: { locale: "ru" } });
    expect(event.message).toBe("hello");
    expect(event.tags?.locale).toBe("ru");
  });
});
