import "@testing-library/jest-dom/vitest";

// Baseline env vars required by lib/env.ts at module load. Individual tests
// can still override with vi.stubEnv() where they need specific values.
// Keeping these here means any test that incidentally imports a module that
// transitively touches lib/env doesn't fail with a Zod validation error.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.GOOGLE_GEMINI_API_KEY ??= "test-gemini-key";
process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??= "test-turnstile-site";
process.env.TURNSTILE_SECRET_KEY ??= "test-turnstile-secret";
process.env.APP_URL ??= "http://localhost:3000";
process.env.CLICK_MERCHANT_ID ??= "MERCH-1";
process.env.CLICK_SERVICE_ID ??= "SVC-1";
process.env.CLICK_MERCHANT_USER_ID ??= "USR-1";
process.env.CLICK_SECRET_KEY ??= "test-click-secret";
process.env.CLICK_ENV ??= "sandbox";
