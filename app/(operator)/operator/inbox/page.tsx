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

const PAGE_SIZE = 50;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  await requireOperator();
  const { filter, page: pageParam } = await searchParams;
  const showOnlyUnread = filter !== "all";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createAdminClient();
  let query = supabase
    .from("contact_messages")
    .select("id, name, email, company, message, locale, source, read_at, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (showOnlyUnread) {
    query = query.is("read_at", null);
  }

  const [{ data: messages, count: filteredCount }, unreadCountRes] = await Promise.all([
    query,
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <PendingPromotions />
      <InboxView
        messages={(messages ?? []) as ContactMessage[]}
        unreadCount={unreadCountRes.count ?? 0}
        filter={showOnlyUnread ? "unread" : "all"}
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
      />
    </div>
  );
}
