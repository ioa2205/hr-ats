import { defineConfig } from "vitest/config";
import path from "path";

// Opt-in matching-quality eval (`pnpm eval`). Separate from the CI unit run:
// it makes real Gemini calls, so it runs in a node env with a long timeout and
// only when GOOGLE_GEMINI_API_KEY is set (the suite self-skips otherwise).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/eval/**/*.eval.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
