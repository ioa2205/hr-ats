import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/auth/guards";
import { InboxView } from "./inbox-view";
import { PendingPromotions } from "@/components/operator/inbox/pending-promotions";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  locale: string | null;
  source: string;
  read_at: string | null;
  created_at: string;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireOperator();
  const { filter } = await searchParams;
  const showOnlyUnread = filter !== "all";

  const supabase = createAdminClient();
  let query = supabase
    .from("contact_messages")
    .select("id, name, email, company, message, locale, source, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (showOnlyUnread) {
    query = query.is("read_at", null);
  }

  const [{ data: messages }, unreadCountRes] = await Promise.all([
    query,
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PendingPromotions />
      <InboxView
        messages={(messages ?? []) as ContactMessage[]}
        unreadCount={unreadCountRes.count ?? 0}
        filter={showOnlyUnread ? "unread" : "all"}
      />
    </div>
  );
}
