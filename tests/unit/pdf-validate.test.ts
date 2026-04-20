import { describe, it, expect } from "vitest";
import { validatePdfBuffer, sanitizeUploadFilename } from "@/lib/pdf/validate";

function minimalValidPdf(): Buffer {
  const body = Buffer.concat([
    Buffer.from("%PDF-1.4\n"),
    // Pad to > 64 bytes; the content doesn't need to be a real object stream
    // for a structural-only check — the trailer is what matters.
    Buffer.from("1 0 obj<</Type/Catalog>>endobj\n"),
    Buffer.from("trailer<</Size 1/Root 1 0 R>>\n"),
    Buffer.from("startxref\n0\n%%EOF\n"),
  ]);
  return body;
}

describe("validatePdfBuffer", () => {
  it("accepts a minimal structurally valid PDF", () => {
    expect(validatePdfBuffer(minimalValidPdf())).toEqual({ ok: true });
  });

  it("accepts trailing whitespace after %%EOF", () => {
    const buf = Buffer.concat([minimalValidPdf(), Buffer.from("   \n\r\t")]);
    expect(validatePdfBuffer(buf)).toEqual({ ok: true });
  });

  it("rejects files shorter than 64 bytes", () => {
    expect(validatePdfBuffer(Buffer.from("%PDF-1.4"))).toEqual({
      ok: false,
      reason: "too_small",
    });
  });

  it("rejects files without the %PDF- magic header", () => {
    const html = Buffer.from(
      "<!DOCTYPE html><html><body>not a pdf, definitely not a pdf at all here goes filler</body></html>",
    );
    expect(validatePdfBuffer(html).ok).toBe(false);
    expect(validatePdfBuffer(html).reason).toBe("bad_magic");
  });

  it("rejects PDF-magic'd files that never contain %%EOF (polyglot case)", () => {
    const polyglot = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from(
        "<script>alert('xss')</script> and random filler to bring this up past 64 bytes total",
      ),
    ]);
    const result = validatePdfBuffer(polyglot);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_eof");
  });

  it("rejects files with garbage after %%EOF", () => {
    const buf = Buffer.concat([
      minimalValidPdf(),
      Buffer.from("<script>alert('xss')</script>"),
    ]);
    expect(validatePdfBuffer(buf)).toEqual({ ok: false, reason: "no_eof" });
  });

  it("rejects PDFs with %%EOF but no /Root in trailer", () => {
    const broken = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("1 0 obj<</Type/Catalog>>endobj\n"),
      Buffer.from("trailer<</Size 1>>\n"),
      Buffer.from("startxref\n0\n%%EOF\n"),
    ]);
    expect(validatePdfBuffer(broken)).toEqual({
      ok: false,
      reason: "no_trailer_root",
    });
  });
});

describe("sanitizeUploadFilename", () => {
  it("falls back to cv.pdf for null/empty", () => {
    expect(sanitizeUploadFilename(null)).toBe("cv.pdf");
    expect(sanitizeUploadFilename("")).toBe("cv.pdf");
    expect(sanitizeUploadFilename("   ")).toBe("cv.pdf");
  });

  it("strips path separators", () => {
    expect(sanitizeUploadFilename("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(sanitizeUploadFilename("C:\\Users\\a\\cv.pdf")).toBe("C:_Users_a_cv.pdf");
  });

  it("clamps to 120 chars preserving .pdf suffix", () => {
    const long = "a".repeat(200);
    const out = sanitizeUploadFilename(long);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("keeps short names intact", () => {
    expect(sanitizeUploadFilename("John Smith CV.pdf")).toBe("John Smith CV.pdf");
  });
});
