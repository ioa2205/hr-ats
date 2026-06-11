import Link from "next/link";
import { CalendarX } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";

export default async function InterviewNotFound() {
  const locale = await getLocale();
  return (
    <Card>
      <EmptyState
        icon={<CalendarX className="h-8 w-8" strokeWidth={1.5} />}
        title={t("interview.expired_heading", locale)}
        description={t("interview.expired_body", locale)}
        action={
          <Button asChild variant="secondary">
            <Link href="/">{t("errors.not_found.home", locale)}</Link>
          </Button>
        }
      />
    </Card>
  );
}
