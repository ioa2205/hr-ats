import { createAdminClient } from "@/lib/supabase/admin";
import type { LocationKind } from "./validators";

export interface PublicInterviewSlot {
  id: string;
  start_at: string;
  position: number;
}

export interface PublicInterview {
  id: string;
  public_token: string;
  status: "pending" | "booked" | "declined" | "cancelled" | "expired";
  duration_minutes: number;
  location_kind: LocationKind;
  location_detail: string | null;
  hr_message: string | null;
  candidate_note: string | null;
  expires_at: string;
  booked_slot_id: string | null;
  booked_at: string | null;
  booked_start_at: string | null;
  slots: PublicInterviewSlot[];
  candidate_first_name: string;
  job: {
    id: string;
    title: string;
    title_ru: string | null;
    title_uz: string | null;
    title_en: string | null;
  };
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    default_locale: string;
  };
}

/**
 * Fetches the trimmed public view of an interview request via the
 * SECURITY DEFINER RPC. Returns null when the token is unknown.
 */
export async function fetchPublicInterview(token: string): Promise<PublicInterview | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_interview_request_by_token", {
    p_token: token,
  });
  if (error || !data) return null;
  return data as unknown as PublicInterview;
}
