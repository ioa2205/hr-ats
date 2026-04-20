/**
 * CLI test harness for CV analysis.
 * Usage: pnpm tsx scripts/test-cv-analysis.ts --pdf ./fixtures/cv.pdf --job-id <uuid>
 *
 * Invokes the local Edge Function (supabase functions serve) and prints result.
 * Requires: local Supabase running, GOOGLE_GEMINI_API_KEY set.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Parse CLI args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const pdfPath = getArg("--pdf");
const jobId = getArg("--job-id");
const functionUrl = getArg("--url") ?? "http://127.0.0.1:54321/functions/v1/process-cv";

if (!pdfPath || !jobId) {
  console.error("Usage: pnpm tsx scripts/test-cv-analysis.ts --pdf <path> --job-id <uuid>");
  console.error("  --pdf      Path to a test CV PDF");
  console.error("  --job-id   UUID of an existing job posting");
  console.error("  --url      (optional) Edge Function URL");
  process.exit(1);
}

const resolvedPdf = resolve(pdfPath);
if (!existsSync(resolvedPdf)) {
  console.error(`PDF not found: ${resolvedPdf}`);
  process.exit(1);
}

// ── Env ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

// ── Setup: create a test candidate ──────────────────────────────────────
async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY!);

  // Upload PDF
  const candidateId = crypto.randomUUID();
  const cvPath = `${jobId}/${candidateId}/cv.pdf`;
  const pdfBuffer = readFileSync(resolvedPdf);

  console.log(`Uploading CV to storage: ${cvPath}`);
  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(cvPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    process.exit(1);
  }

  // Insert candidate row
  console.log(`Creating candidate: ${candidateId}`);
  const { error: insertError } = await supabase.from("candidates").insert({
    id: candidateId,
    job_posting_id: jobId,
    full_name: "Test Candidate",
    phone_number: "+998901234567",
    cv_storage_path: cvPath,
    status: "pending_analysis",
  });

  if (insertError) {
    console.error("Insert failed:", insertError);
    process.exit(1);
  }

  // Invoke edge function
  console.log(`Invoking process-cv for candidate ${candidateId}...`);
  const startedAt = Date.now();
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ candidateId }),
  });

  const elapsed = Date.now() - startedAt;
  const body = await response.json();

  console.log(`\nResponse (${response.status}) in ${elapsed}ms:`);
  console.log(JSON.stringify(body, null, 2));

  // Fetch updated candidate
  const { data: updated } = await supabase
    .from("candidates")
    .select(
      "status, match_score, language_detected, ai_error, " +
        "one_line_summary, one_line_summary_uz, one_line_summary_en, " +
        "strengths, strengths_uz, strengths_en, " +
        "gaps, gaps_uz, gaps_en",
    )
    .eq("id", candidateId)
    .single();

  console.log("\nCandidate after processing:");
  console.log(JSON.stringify(updated, null, 2));

  // Fetch attempt log
  const { data: attempts } = await supabase
    .from("ai_processing_attempts")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("\nLatest processing attempt:");
  console.log(JSON.stringify(attempts?.[0] ?? null, null, 2));

  // Cleanup
  console.log("\nCleaning up test data...");
  await supabase.from("ai_processing_attempts").delete().eq("candidate_id", candidateId);
  await supabase.from("candidates").delete().eq("id", candidateId);
  await supabase.storage.from("cvs").remove([cvPath]);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Test harness error:", err);
  process.exit(1);
});
