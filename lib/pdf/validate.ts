/**
 * Lightweight PDF structural validation, no external parser.
 *
 * A valid PDF must start with `%PDF-<version>`, end with `%%EOF`, and contain
 * a trailer referencing `/Root`. Polyglot attacks (HTML/JS disguised with a
 * PDF header) typically fail one of the latter two checks. Scanned-image PDFs
 * with no extractable text still pass — that's intended, since legitimate CVs
 * are frequently scan-only.
 */

const PDF_MAGIC = Buffer.from("%PDF-");
const EOF_MARKER = Buffer.from("%%EOF");
// Chunk searched at the end of the file for both the EOF marker and the
// trailer dictionary. PDF specification caps xref table footprint; 4 KiB is
// comfortably above what the trailer needs.
const TRAILER_SCAN_BYTES = 4096;

export interface PdfValidationResult {
  ok: boolean;
  reason?:
    | "too_small"
    | "bad_magic"
    | "no_eof"
    | "no_trailer_root";
}

/**
 * Synchronously validate a PDF buffer's basic structural markers.
 * Accepts any file ≥ 64 bytes that opens with `%PDF-`, ends with `%%EOF`
 * (possibly followed by trailing whitespace), and has a `/Root` reference
 * within the trailer region.
 */
export function validatePdfBuffer(buf: Buffer): PdfValidationResult {
  if (buf.length < 64) return { ok: false, reason: "too_small" };

  if (!buf.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return { ok: false, reason: "bad_magic" };
  }

  const tailStart = Math.max(0, buf.length - TRAILER_SCAN_BYTES);
  const tail = buf.subarray(tailStart);

  const eofIdx = tail.lastIndexOf(EOF_MARKER);
  if (eofIdx === -1) {
    return { ok: false, reason: "no_eof" };
  }

  // Only trailing whitespace is allowed after the last %%EOF marker.
  const afterEof = tail.subarray(eofIdx + EOF_MARKER.length);
  for (const byte of afterEof) {
    // 0x20 space, 0x09 tab, 0x0A LF, 0x0D CR
    if (byte !== 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
      return { ok: false, reason: "no_eof" };
    }
  }

  // Trailer dictionary must reference a root catalog. Linearized PDFs place
  // the /Root reference near the beginning, but every conformant PDF repeats
  // it in the trailing trailer dictionary as well.
  const tailAscii = tail.toString("binary");
  if (!/\/Root\s+\d+\s+\d+\s+R/.test(tailAscii)) {
    return { ok: false, reason: "no_trailer_root" };
  }

  return { ok: true };
}

/**
 * Clamp a user-provided filename to a safe 120-char upper bound after
 * stripping path separators and control characters. Callers still use UUIDs
 * for storage paths; this is just for display / metadata surfaces.
 */
export function sanitizeUploadFilename(input: string | null | undefined): string {
  if (!input) return "cv.pdf";
  const stripped = input
    .replace(/[\\/\x00-\x1f\x7f]/g, "_")
    .trim();
  if (!stripped) return "cv.pdf";
  return stripped.length > 120 ? `${stripped.slice(0, 116)}.pdf` : stripped;
}
