import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signup?intent=pro&utm_source=landing&utm_section=pricing_pro");
  }

  if (user.app_metadata?.is_operator === true) {
    redirect("/operator/inbox");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_company_id) {
    redirect("/onboarding?intent=pro");
  }

  redirect("/hr/settings/billing?intent=pro");
}
