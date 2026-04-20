import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchPublicInterview } from "@/lib/interviews/public-fetch";
import { buildIcs } from "@/lib/calendar/ics";

export const runtime = "nodejs";

function locationLabel(
  kind: "google_meet" | "telegram" | "phone" | "office" | "custom",
  detail: string | null,
): string {
  switch (kind) {
    case "google_meet":
      return detail ? `Google Meet — ${detail}` : "Google Meet";
    case "telegram":
      return detail ? `Telegram — ${detail}` : "Telegram";
    case "phone":
      return detail ? `Phone — ${detail}` : "Phone interview";
    case "office":
      return detail ? `Office — ${detail}` : "Office";
    case "custom":
      return detail ?? "Interview";
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchPublicInterview(token);

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (data.status !== "booked" || !data.booked_start_at) {
    return NextResponse.json({ error: "not_booked" }, { status: 409 });
  }

  const startAt = new Date(data.booked_start_at);
  const endAt = new Date(startAt.getTime() + data.duration_minutes * 60_000);

  const summary = `${data.job.title} — ${data.company.name}`;
  const description = data.hr_message
    ? `${data.hr_message}\n\nScheduled via TezHR.`
    : "Scheduled via TezHR.";

  const ics = buildIcs({
    uid: `interview-${data.id}@tezhr.uz`,
    startAt,
    endAt,
    summary,
    description,
    location: locationLabel(data.location_kind, data.location_detail),
    organizerName: data.company.name,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${data.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
