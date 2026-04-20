import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./lib/sentry/scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
  enabled: Boolean(process.env.SENTRY_DSN),
  beforeSend: scrubSentryEvent,
});
