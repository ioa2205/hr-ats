import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Minimal .env.local loader so tests can read Supabase credentials without
// requiring the `dotenv` dev dependency.
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Keep a small retry budget even outside CI: the dev auto-confirm email flow
  // and client-side router cache can produce sporadic first-run failures that
  // succeed on retry.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Use the production build for E2E: Turbopack on-demand compiles in `pnpm dev`
    // race with Playwright's navigation timeouts, causing sporadic 15s waits on
    // first hit to each route. `pnpm start` serves pre-built routes instantly.
    // Set PLAYWRIGHT_DEV=1 to use the dev server (useful when iterating on tests).
    command: process.env.PLAYWRIGHT_DEV ? "pnpm dev" : "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
