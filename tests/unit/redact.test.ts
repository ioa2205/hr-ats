import { describe, it, expect } from "vitest";
import { redactSecrets } from "@/lib/security/redact";

describe("redactSecrets", () => {
  it("redacts the exact Google 'suspended key' error that leaked", () => {
    const real =
      "{\"error\":{\"code\":403,\"message\":\"Permission denied: Consumer 'api_key:AIzaSyCikO9MCtNrw3XlKrT4NVS3bXC_A10jr7Y' has been suspended.\",\"status\":\"PERMISSION_DENIED\"}}";
    const out = redactSecrets(real);
    expect(out).not.toContain("AIzaSyCikO9MCtNrw3XlKrT4NVS3bXC_A10jr7Y");
    // Diagnostic context is preserved.
    expect(out).toContain("PERMISSION_DENIED");
    expect(out).toContain("has been suspended");
    expect(out).toContain("[redacted-key]");
  });

  it("redacts a bare Google API key anywhere in the text", () => {
    const out = redactSecrets("key=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7 used");
    expect(out).not.toMatch(/AIzaSy[A-Za-z0-9_-]+/);
    expect(out).toContain("[redacted-key]");
  });

  it("redacts JWT-shaped tokens (e.g. service-role keys)", () => {
    const jwt =
      "failed with eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const out = redactSecrets(jwt);
    expect(out).toContain("[redacted-jwt]");
    expect(out).not.toContain("eyJhbGci");
  });

  it("redacts bearer tokens and generic api_key echoes", () => {
    expect(redactSecrets("Authorization: Bearer sk_live_abcdef1234567890XYZ")).not.toContain(
      "abcdef1234567890XYZ",
    );
    expect(redactSecrets('apikey="abcd1234efgh5678"')).toContain("[redacted]");
  });

  it("leaves benign error markers untouched", () => {
    for (const marker of [
      "ai_unavailable",
      "AI timeout",
      "rate_limited",
      "Job posting not found",
      "Failed to access CV file",
      "analysis_failed",
    ]) {
      expect(redactSecrets(marker)).toBe(marker);
    }
  });

  it("handles null/undefined/empty safely", () => {
    expect(redactSecrets(null)).toBe("");
    expect(redactSecrets(undefined)).toBe("");
    expect(redactSecrets("")).toBe("");
  });
});
