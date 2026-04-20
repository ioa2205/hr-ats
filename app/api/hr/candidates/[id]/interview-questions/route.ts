import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { canGenerateQuestions } from "@/lib/companies/quota";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  INTERVIEW_QUESTIONS_MODEL_TAG,
  generateInterviewQuestions,
  parseStoredInterviewQuestions,
} from "@/lib/gemini/interview-questions";
import { getAiSettings } from "@/lib/ai-settings.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;
  const url = new URL(req.url);
  const regenerate = url.searchParams.get("regenerate") === "true";

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();

    const { data: candidate, error: fetchError } = await admin
      .from("candidates")
      .select(
        "id, full_name, status, match_score, one_line_summary, strengths, gaps, language_detected, ai_interview_questions, job_postings!inner(id, title, description, required_skills, company_id)",
      )
      .eq("id", candidateId)
      .maybeSingle();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = unwrapEmbed<{
      id: string;
      title: string;
      description: string;
      required_skills: string[];
      company_id: string;
    }>(candidate.job_postings);

    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (candidate.status !== "analyzed" && candidate.status !== "invited") {
      return NextResponse.json(
        { error: "candidate_not_analyzed" },
        { status: 400 },
      );
    }

    const existing = parseStoredInterviewQuestions(candidate.ai_interview_questions);
    if (existing && !regenerate) {
      return NextResponse.json({ ok: true, questions: existing, cached: true });
    }

    const rl = await rateLimit({
      key: `interview-questions:${access.user.id}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retry_after: rl.retryAfter ?? 3600 },
        { status: 429 },
      );
    }

    const quota = await canGenerateQuestions(access.companyId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason ?? "quota_exceeded", used: quota.used, limit: quota.limit },
        { status: 402 },
      );
    }

    const aiSettings = await getAiSettings(access.companyId);

    let result;
    try {
      result = await generateInterviewQuestions({
        job: {
          title: job.title,
          description: job.description,
          required_skills: job.required_skills ?? [],
        },
        candidate: {
          full_name: candidate.full_name,
          match_score: candidate.match_score,
          one_line_summary: candidate.one_line_summary,
          strengths: candidate.strengths,
          gaps: candidate.gaps,
          language_detected: candidate.language_detected,
        },
        tone: aiSettings.tone,
        questionCount: aiSettings.interviewQuestionCount,
      });
    } catch (err) {
      logger.error(
        { context: "interview-questions", err, candidateId },
        "Gemini call failed for interview questions",
      );
      await admin.from("ai_processing_attempts").insert({
        candidate_id: candidateId,
        company_id: access.companyId,
        status: "failed",
        model: INTERVIEW_QUESTIONS_MODEL_TAG,
        error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      });
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    const { error: updateError } = await admin
      .from("candidates")
      .update({ ai_interview_questions: result.stored })
      .eq("id", candidateId);

    if (updateError) {
      logger.error(
        { context: "interview-questions", err: updateError, candidateId },
        "Failed to persist interview questions",
      );
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await admin.from("ai_processing_attempts").insert({
      candidate_id: candidateId,
      company_id: access.companyId,
      status: "success",
      model: INTERVIEW_QUESTIONS_MODEL_TAG,
      prompt_tokens: result.call.promptTokens,
      output_tokens: result.call.outputTokens,
      duration_ms: result.call.durationMs,
      cost_usd: result.costUsd,
    });

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: regenerate
        ? "candidate.questions.regenerated"
        : "candidate.questions.generated",
      entity_type: "candidate",
      entity_id: candidateId,
    });

    return NextResponse.json({
      ok: true,
      questions: result.stored,
      cached: false,
    });
  } catch (err) {
    logger.error(
      { context: "interview-questions", err, candidateId },
      "Unhandled error in interview-questions endpoint",
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
