// process-cv edge function — Phase 4: AI CV analysis pipeline.
// Deploy: supabase functions deploy process-cv --no-verify-jwt
// Secrets: supabase secrets set GOOGLE_GEMINI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...

import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod/v4";
import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Flash is ~4x cheaper than Pro and fast enough for single-pass CV screening.
// Matches the model + pricing the active-sourcing funnel already runs on
// (lib/gemini/client.ts MODEL_FLASH, lib/sourcing/pricing.ts FLASH_*).
const MODEL = "gemini-3-flash-preview";
const INPUT_USD_PER_MTOK = 0.5;
const OUTPUT_USD_PER_MTOK = 3.0;

// ---------------------------------------------------------------------------
// Schema (mirrored from lib/gemini/schema.ts for Deno compatibility)
// ---------------------------------------------------------------------------
const analysisSchema = {
  type: "object",
  properties: {
    match_score: { type: "integer", minimum: 0, maximum: 100 },
    language_detected: {
      type: "string",
      enum: ["uz", "ru", "en", "other"],
    },
    one_line_summary_ru: { type: "string", maxLength: 150 },
    one_line_summary_uz: { type: "string", maxLength: 180 },
    one_line_summary_en: { type: "string", maxLength: 150 },
    strengths_ru: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 1,
      maxItems: 5,
    },
    strengths_uz: {
      type: "array",
      items: { type: "string", maxLength: 140 },
      minItems: 1,
      maxItems: 5,
    },
    strengths_en: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 1,
      maxItems: 5,
    },
    gaps_ru: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 0,
      maxItems: 5,
    },
    gaps_uz: {
      type: "array",
      items: { type: "string", maxLength: 140 },
      minItems: 0,
      maxItems: 5,
    },
    gaps_en: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 0,
      maxItems: 5,
    },
  },
  required: [
    "match_score",
    "language_detected",
    "one_line_summary_ru",
    "one_line_summary_uz",
    "one_line_summary_en",
    "strengths_ru",
    "strengths_uz",
    "strengths_en",
    "gaps_ru",
    "gaps_uz",
    "gaps_en",
  ],
} as const;

const AnalysisZod = z.object({
  match_score: z.number().int().min(0).max(100),
  language_detected: z.enum(["uz", "ru", "en", "other"]),
  one_line_summary_ru: z.string().min(1).max(150),
  one_line_summary_uz: z.string().min(1).max(180),
  one_line_summary_en: z.string().min(1).max(150),
  strengths_ru: z.array(z.string().min(1).max(120)).min(1).max(5),
  strengths_uz: z.array(z.string().min(1).max(140)).min(1).max(5),
  strengths_en: z.array(z.string().min(1).max(120)).min(1).max(5),
  gaps_ru: z.array(z.string().min(1).max(120)).min(0).max(5),
  gaps_uz: z.array(z.string().min(1).max(140)).min(0).max(5),
  gaps_en: z.array(z.string().min(1).max(120)).min(0).max(5),
});

const RequestBody = z.object({
  candidateId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function calcCost(promptTokens: number, outputTokens: number): number {
  return (promptTokens * INPUT_USD_PER_MTOK + outputTokens * OUTPUT_USD_PER_MTOK) / 1_000_000;
}

interface JobPosting {
  title: string;
  description: string;
  required_skills: string[];
}

type AiTone = "direct" | "neutral" | "generous";

/**
 * Mirrors `toneInstruction` in lib/ai-settings.ts — kept inline so the Deno
 * Edge Function doesn't need to bundle the Next.js module graph.
 */
function toneInstruction(tone: AiTone): string {
  if (tone === "direct") {
    return [
      "",
      "=== VERDICT TONE: DIRECT ===",
      "Err on the side of skepticism. Prefer concrete evidence over potential.",
      "Issue 'reject' over 'review' when requirements are clearly unmet.",
      "Strengths list must cite concrete evidence; drop soft adjectives.",
    ].join("\n");
  }
  if (tone === "generous") {
    return [
      "",
      "=== VERDICT TONE: GENEROUS ===",
      "Give marginal candidates the benefit of the doubt.",
      "Prefer 'review' over 'reject' when a gap could plausibly be filled on the job.",
      "Note transferable skills explicitly in strengths when direct experience is missing.",
    ].join("\n");
  }
  return "";
}

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAiTone(supabase: any, companyId: string): Promise<AiTone> {
  const { data } = await supabase
    .from("company_settings")
    .select("value")
    .eq("company_id", companyId)
    .eq("key", "ai_tone")
    .maybeSingle();
  const v = data?.value;
  return v === "direct" || v === "generous" ? v : "neutral";
}

function buildCvAnalysisPrompt(posting: JobPosting, tone: AiTone = "neutral"): string {
  const skills = posting.required_skills.length
    ? posting.required_skills.join(", ")
    : "not specified";

  return `You are a senior HR analyst screening CVs for a specific job.
You must evaluate CVs written in Uzbek, Russian, or English with equal rigor.
Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

=== RESPONSE RULES ===
Produce the analysis simultaneously in Russian, Uzbek, and English.
All three versions must cover the same ground — not literal word-for-word,
but the same facts, same evidence, same verdict.

- one_line_summary_ru / _uz / _en: one sentence summarizing fit.
    ru: max 120 characters.
    uz: max 140 characters, Latin script only.
    en: max 120 characters.
- strengths_ru / _uz / _en: 2-5 bullets each. Cite specific evidence from
  the CV (job title, company, school, year). Each bullet under ~80 chars.
- gaps_ru / _uz / _en: 0-5 bullets each. Same format as strengths.
- language_detected: the primary language of the CV text (uz, ru, en, or other).
- match_score: integer 0-100 (see scoring guide).

=== LANGUAGE RULES ===
- Russian: Standard business Russian as used in Uzbek corporate contexts.
- Uzbek: Latin script only. Pragmatic, direct, modern. Avoid archaisms.
- English: Clear US-style business English. No British spellings.

=== SCORING GUIDE ===
- 0-15: CV is entirely unrelated to the role.
- 30-60: Partial match — some relevant experience or skills.
- 70-90: Strong match — meets most requirements.
- 90+: Exceptional — exceeds requirements with clear evidence.

=== JOB DETAILS ===
Title: ${posting.title}
Description: ${posting.description}
Required Skills: ${skills}${toneInstruction(tone)}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) : str;
}

function log(candidateId: string, level: string, msg: string, extra?: unknown) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    candidateId,
    msg,
    ...(extra ? { extra } : {}),
  };
  if (level === "error") {
    console.error(`[process-cv] ${candidateId}:`, msg, extra ?? "");
  } else {
    console.log(`[process-cv] ${candidateId}:`, msg, extra ?? "");
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // ── 1. Validate request body ──────────────────────────────────────────
  let candidateId: string;
  try {
    const body = await req.json();
    const parsed = RequestBody.parse(body);
    candidateId = parsed.candidateId;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request body", detail: String(err) }), {
      status: 400,
      headers,
    });
  }

  // ── Init clients ──────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  try {
    // ── 2. Atomic claim — avoid double-processing ───────────────────────
    log(candidateId, "info", "Attempting atomic claim");
    const { data: claimed, error: claimError } = await supabase
      .from("candidates")
      .update({ status: "analyzing" })
      .in("status", ["pending_analysis", "analysis_failed"])
      .eq("id", candidateId)
      .select("*")
      .single();

    if (claimError || !claimed) {
      log(candidateId, "info", "Skipped — already claimed or not found", claimError);
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200, headers });
    }

    // ── 3. Fetch associated job posting ─────────────────────────────────
    log(candidateId, "info", "Fetching job posting", { jobId: claimed.job_posting_id });
    const { data: posting, error: postingError } = await supabase
      .from("job_postings")
      .select("title, description, required_skills, company_id")
      .eq("id", claimed.job_posting_id)
      .single();

    if (postingError || !posting) {
      log(candidateId, "error", "Job posting not found", postingError);
      const nextRetry = claimed.retry_count + 1;
      await supabase
        .from("candidates")
        .update({
          status: "analysis_failed",
          ai_error: "Job posting not found",
          retry_count: nextRetry,
        })
        .eq("id", candidateId);
      // No company to refund against here — posting lookup is what gave us
      // company_id. The quota entry is effectively orphaned; it won't be
      // retried once retry_count >= 3 either. Accept the leak in this very
      // rare edge case rather than guess a company id.
      return new Response(JSON.stringify({ error: "Job posting not found" }), {
        status: 500,
        headers,
      });
    }

    // ── 4. Generate signed URL for CV ───────────────────────────────────
    log(candidateId, "info", "Generating signed URL for CV");
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("cvs")
      .createSignedUrl(claimed.cv_storage_path!, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      log(candidateId, "error", "Failed to create signed URL", signedUrlError);
      await supabase
        .from("candidates")
        .update({
          status: "analysis_failed",
          ai_error: "Failed to access CV file",
          retry_count: claimed.retry_count + 1,
        })
        .eq("id", candidateId);
      await supabase.from("ai_processing_attempts").insert({
        candidate_id: candidateId,
        company_id: posting.company_id,
        status: "failed",
        model: MODEL,
        error: "Signed URL creation failed",
      });
      return new Response(JSON.stringify({ error: "CV access failed" }), { status: 500, headers });
    }

    // ── 5. Fetch PDF bytes → base64 ────────────────────────────────────
    log(candidateId, "info", "Downloading PDF");
    const pdfResponse = await fetch(signedUrlData.signedUrl);
    if (!pdfResponse.ok) {
      throw new Error(`PDF download failed: ${pdfResponse.status}`);
    }
    const pdfBytes = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // ── 6. Call Gemini ──────────────────────────────────────────────────
    log(candidateId, "info", "Calling Gemini API");
    const tone = await fetchAiTone(supabase, posting.company_id);
    log(candidateId, "info", "AI tone resolved", { tone });

    const startedAt = Date.now();
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            { text: "Analyze this CV and return JSON per the schema." },
          ],
        },
      ],
      config: {
        systemInstruction: buildCvAnalysisPrompt(posting, tone),
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
    const durationMs = Date.now() - startedAt;

    // ── 7. Parse + validate response ────────────────────────────────────
    log(candidateId, "info", "Parsing Gemini response", { durationMs });
    const text = result.text;
    const usage = result.usageMetadata;

    const parsed = JSON.parse(text!);
    const analysis = AnalysisZod.parse(parsed);

    const promptTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;
    const costUsd = calcCost(promptTokens, outputTokens);

    // ── 8. Success — update candidate + insert attempt ──────────────────
    log(candidateId, "info", "Analysis complete", {
      matchScore: analysis.match_score,
      promptTokens,
      outputTokens,
      costUsd,
    });

    await supabase
      .from("candidates")
      .update({
        status: "analyzed",
        match_score: analysis.match_score,
        language_detected: analysis.language_detected,
        // Russian canonical (legacy columns kept as RU)
        one_line_summary: analysis.one_line_summary_ru,
        strengths: analysis.strengths_ru,
        gaps: analysis.gaps_ru,
        // Uzbek
        one_line_summary_uz: analysis.one_line_summary_uz,
        strengths_uz: analysis.strengths_uz,
        gaps_uz: analysis.gaps_uz,
        // English
        one_line_summary_en: analysis.one_line_summary_en,
        strengths_en: analysis.strengths_en,
        gaps_en: analysis.gaps_en,
        ai_error: null,
      })
      .eq("id", candidateId);

    await supabase.from("ai_processing_attempts").insert({
      candidate_id: candidateId,
      company_id: posting.company_id,
      status: "success",
      model: MODEL,
      prompt_tokens: promptTokens,
      output_tokens: outputTokens,
      duration_ms: durationMs,
      cost_usd: costUsd,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err: unknown) {
    // ── 9. Error classification and persistence ─────────────────────────
    const error = err as { status?: number; message?: string; code?: string };
    const message = error.message ?? String(err);

    log(candidateId, "error", "Processing failed", { message });

    // Classify the error
    const isRateLimited =
      error.status === 429 ||
      error.code === "rate_limited" ||
      message.toLowerCase().includes("rate") ||
      message.toLowerCase().includes("429");

    const isTimeout =
      message.toLowerCase().includes("timeout") || message.toLowerCase().includes("deadline");

    // Fetch current retry_count plus the owning company_id (for cost attribution)
    const { data: current } = await supabase
      .from("candidates")
      .select("retry_count, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .single();
    const retryCount = (current?.retry_count ?? 0) + 1;
    // PostgREST may return embedded `job_postings` as an array when its FK is
    // also referenced by `job_postings_with_counts`. Normalize both shapes.
    const jobRel = current?.job_postings as
      | { company_id: string }
      | { company_id: string }[]
      | null
      | undefined;
    const companyId =
      (Array.isArray(jobRel) ? jobRel[0]?.company_id : jobRel?.company_id) ?? null;

    if (isRateLimited) {
      log(candidateId, "info", "Rate limited — returning to pending_analysis");
      // Keep status pending so the retry cron picks it up, but tag ai_error
      // with the 'rate_limited' marker so the HR UI can surface a distinct
      // "AI is busy, we'll retry automatically" banner instead of the generic
      // analysis_failed state. ai_error gets cleared on the next successful
      // attempt (see line 400).
      await supabase
        .from("candidates")
        .update({ status: "pending_analysis", ai_error: "rate_limited" })
        .eq("id", candidateId);
      await supabase.from("ai_processing_attempts").insert({
        candidate_id: candidateId,
        company_id: companyId,
        status: "rate_limited",
        model: MODEL,
        error: truncate(message, 500),
      });
    } else if (isTimeout) {
      log(candidateId, "error", "Timeout — marking analysis_failed");
      await supabase
        .from("candidates")
        .update({
          status: "analysis_failed",
          ai_error: "AI timeout",
          retry_count: retryCount,
        })
        .eq("id", candidateId);
      await supabase.from("ai_processing_attempts").insert({
        candidate_id: candidateId,
        company_id: companyId,
        status: "timeout",
        model: MODEL,
        error: truncate(message, 500),
      });
    } else {
      log(candidateId, "error", "General failure — marking analysis_failed");
      await supabase
        .from("candidates")
        .update({
          status: "analysis_failed",
          ai_error: truncate(message, 500),
          retry_count: retryCount,
        })
        .eq("id", candidateId);
      await supabase.from("ai_processing_attempts").insert({
        candidate_id: candidateId,
        company_id: companyId,
        status: "failed",
        model: MODEL,
        error: truncate(message, 500),
      });
    }

    // Refund the CV quota once, at the moment we exhaust the retry budget
    // (retry-pending-cvs cron only retries rows with retry_count < 3).
    // Rate-limited failures are transient and keep the row in pending_analysis,
    // so they never reach this branch.
    if (!isRateLimited && retryCount >= 3) {
      if (!companyId) {
        // Orphaned candidate (broken job_postings FK) — the refund can't be
        // attributed to a company. Log loudly instead of silently leaking it.
        log(candidateId, "error", "Cannot refund CV quota: companyId is null (orphaned candidate)");
      } else {
        const { error: refundError } = await supabase.rpc("refund_cv_quota", {
          p_company_id: companyId,
        });
        if (refundError) {
          log(candidateId, "error", "Quota refund failed", refundError);
        } else {
          log(candidateId, "info", "CV quota refunded", { companyId });
        }
      }
    }

    return new Response(JSON.stringify({ error: truncate(message, 500) }), {
      status: 500,
      headers,
    });
  }
});
