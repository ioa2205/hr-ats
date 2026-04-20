import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { callGeminiFlashJson } from "@/lib/gemini/call-flash";
import {
  buildJobDraftPrompt,
  jobDraftJsonSchema,
  JobDraftZod,
} from "@/lib/gemini/job-draft";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  brief: z.string().min(4).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // 10 drafts / hour / user — fair ceiling for cost control.
    const rl = await rateLimit({
      key: `ai-draft-job:${access.user.id}`,
      limit: 10,
      windowSeconds: 3600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: rl.retryAfter ?? 60 },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const { text, durationMs } = await callGeminiFlashJson({
      systemInstruction: buildJobDraftPrompt(),
      userPrompt: `HR brief:\n\n${parsed.data.brief.trim()}\n\nProduce the job posting now.`,
      responseSchema: jobDraftJsonSchema,
      temperature: 0.4,
      maxOutputTokens: 4096,
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      logger.error({ context: "ai-draft", err, text: text.slice(0, 200) }, "Gemini returned non-JSON");
      return NextResponse.json({ error: "ai_parse_failed" }, { status: 502 });
    }

    const draft = JobDraftZod.safeParse(parsedJson);
    if (!draft.success) {
      logger.error(
        { context: "ai-draft", issues: draft.error.issues.slice(0, 3) },
        "AI draft failed Zod validation",
      );
      return NextResponse.json({ error: "ai_schema_mismatch" }, { status: 502 });
    }

    logger.info(
      {
        context: "ai-draft",
        durationMs,
        companyId: access.companyId,
        briefLen: parsed.data.brief.length,
      },
      "Drafted job posting",
    );

    return NextResponse.json({ draft: draft.data, remaining: rl.remaining });
  } catch (err) {
    logger.error({ context: "ai-draft", err }, "Unexpected error");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
