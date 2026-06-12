import type { Database } from "./supabase";

// === Row types (read from DB) ===
export type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
export type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
export type AiProcessingAttempt = Database["public"]["Tables"]["ai_processing_attempts"]["Row"];
export type RateLimit = Database["public"]["Tables"]["rate_limits"]["Row"];
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"];
export type AppSetting = Database["public"]["Tables"]["platform_settings"]["Row"];

// === Insert types ===
export type JobPostingInsert = Database["public"]["Tables"]["job_postings"]["Insert"];
export type CandidateInsert = Database["public"]["Tables"]["candidates"]["Insert"];
export type AiProcessingAttemptInsert =
  Database["public"]["Tables"]["ai_processing_attempts"]["Insert"];

// === Update types ===
export type JobPostingUpdate = Database["public"]["Tables"]["job_postings"]["Update"];
export type CandidateUpdate = Database["public"]["Tables"]["candidates"]["Update"];

// === Enum types ===
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type CandidateStatus = Database["public"]["Enums"]["candidate_status"];
export type DetectedLanguage = Database["public"]["Enums"]["detected_language"];
export type AiAttemptStatus = Database["public"]["Enums"]["ai_attempt_status"];

// === Tenant types ===
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyMember = Database["public"]["Tables"]["company_members"]["Row"];
export type CompanyInvite = Database["public"]["Tables"]["company_invites"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type CompanyRole = Database["public"]["Enums"]["company_role"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

// === Domain types (not in DB) ===
export interface HardRequirement {
  id: string;
  label_ru: string;
  label_uz: string;
  label_en?: string;
  type: "boolean" | "number";
  min_value: number | null;
  order: number;
}

/** Persisted shape of `candidates.requirements_responses` — req.id → raw answer string. */
export type RequirementResponses = Record<string, string>;

/** Persisted shape of `candidates.requirements_snapshot` — frozen copy of the job's requirements at submission time. */
export type RequirementSnapshot = HardRequirement[];

/**
 * An OPTIONAL question — structurally identical to a hard requirement
 * (boolean/number), but it never blocks the candidate. Answers are recorded and
 * fed to AI scoring as additional signal only.
 */
export type OptionalQuestion = HardRequirement;

/** A free-text (OPEN) question the applicant answers in prose. */
export interface OpenQuestion {
  id: string;
  prompt_ru: string;
  prompt_uz: string;
  prompt_en?: string;
  order: number;
}

/** Persisted shape of `candidates.optional_responses` / `open_responses` — question id → raw answer. */
export type OptionalResponses = Record<string, string>;
export type OpenResponses = Record<string, string>;

export type UserRole = "hr" | "admin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}
