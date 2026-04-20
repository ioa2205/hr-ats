// Next.js calls this on server boot and on each edge-runtime cold start.
// Routes the Sentry init to the right file based on the runtime Next is in.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Force env validation at boot; Zod throws with a readable list of missing vars.
    await import("./lib/env");
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./lib/env");
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
