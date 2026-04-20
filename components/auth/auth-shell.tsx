import { PublicShell } from "@/components/candidate/public-shell";

/**
 * Backwards-compatible alias. Both `/auth/*` and `/onboarding/*` historically
 * called this component; the implementation now lives in `PublicShell` so
 * the candidate-side `/interview/[token]` and `/apply/[token]` pages can
 * share the exact same chrome.
 */
export const AuthShell = PublicShell;
