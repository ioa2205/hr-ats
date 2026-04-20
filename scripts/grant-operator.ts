/**
 * Bootstrap an operator account by inserting into `pending_operators`.
 *
 * The insertion allows the next profile created with that email to auto-elevate
 * via the `auto_elevate_operator()` trigger (migration 018). If the profile
 * already exists, it is auto-promoted on the next auth token refresh through
 * `sync_operator_jwt_claim()` — to force an immediate claim update, the user
 * should log out and log back in.
 *
 * Usage:
 *   pnpm tsx scripts/grant-operator.ts --email=bootstrap@example.com --reason="initial setup"
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Writes an operator_audit_log entry with action='operator.grant.bootstrap'.
 * This is the only operator-grant path that bypasses the two-operator
 * approval flow and must be used sparingly (initial seed, DR recovery).
 */

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function parseArgs(): { email: string; reason: string } {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith("--email="));
  const reasonArg = args.find((a) => a.startsWith("--reason="));
  if (!emailArg) {
    console.error("Missing --email=<address>");
    console.error(
      "Usage: pnpm tsx scripts/grant-operator.ts --email=<address> [--reason=<text>]",
    );
    process.exit(1);
  }
  const email = emailArg.slice("--email=".length).trim().toLowerCase();
  const parsed = z.email().safeParse(email);
  if (!parsed.success) {
    console.error(`Invalid email: ${email}`);
    process.exit(1);
  }
  const reason = reasonArg
    ? reasonArg.slice("--reason=".length).trim()
    : "bootstrap via scripts/grant-operator.ts";
  return { email, reason };
}

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
    console.error("Source your local .env or export them before running this script.");
    process.exit(1);
  }

  const { email, reason } = parseArgs();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Insert into pending_operators (upsert on primary key `email`).
  const { error: pendErr } = await admin
    .from("pending_operators")
    .upsert({ email, reason }, { onConflict: "email" });
  if (pendErr) {
    console.error("Failed to upsert pending_operators row:", pendErr.message);
    process.exit(1);
  }

  // 2. If the profile already exists, flip `is_operator` immediately so the
  //    next JWT refresh surfaces the claim. Safe for new profiles too — the
  //    trigger in migration 018 handles them on first insert.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, is_operator")
    .eq("email", email)
    .maybeSingle();

  let actorId: string | null = null;
  if (profile) {
    actorId = profile.id;
    if (!profile.is_operator) {
      const { error: flipErr } = await admin
        .from("profiles")
        .update({ is_operator: true })
        .eq("id", profile.id);
      if (flipErr) {
        console.error("Failed to flip profiles.is_operator:", flipErr.message);
        process.exit(1);
      }
    }
  }

  // 3. Audit trail. Falls back to a zero UUID when no profile row exists yet;
  //    this entry remains attributable by email via metadata until the profile
  //    is created and the auto-elevate trigger runs.
  const { error: auditErr } = await admin.from("operator_audit_log").insert({
    actor_user_id: actorId ?? "00000000-0000-0000-0000-000000000000",
    action: "operator.grant.bootstrap",
    target_user_id: actorId,
    metadata: { email, reason, profile_existed: Boolean(profile) },
  });
  if (auditErr) {
    // Non-fatal — the grant succeeded even if audit logging failed. Report
    // it so the operator notices.
    console.error("Warning: failed to write operator_audit_log:", auditErr.message);
  }

  console.log(
    `Granted operator status to ${email}. ${profile ? "Existing profile flipped; user must log out+in to refresh JWT." : "No profile yet — auto-elevation will apply on first signup."}`,
  );
}

main().catch((err) => {
  console.error("grant-operator failed:", err);
  process.exit(1);
});
