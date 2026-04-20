import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import QRCode from "qrcode";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireCompanyAccessApi();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: job, error } = await supabaseAdmin
      .from("job_postings")
      .select("public_token")
      .eq("id", id)
      .eq("company_id", access.companyId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = `${env.APP_URL}/apply/${job.public_token}`;
    const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 200 });

    return NextResponse.json({ url, qr_svg: qrSvg });
  } catch (err) {
    logger.error({ err }, "[api/hr/jobs/:id/link] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
