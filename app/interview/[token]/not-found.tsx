import Link from "next/link";
import { Panel, TezButton } from "@/components/hr/design";
import { getLocale, t } from "@/lib/i18n";

export default async function InterviewNotFound() {
  const locale = await getLocale();
  return (
    <Panel>
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <h1 className="text-ink text-[24px] font-bold tracking-[-0.02em]">
          {t("interview.expired_heading", locale)}
        </h1>
        <p className="text-ink-3 max-w-sm text-[14.5px]">
          {t("interview.expired_body", locale)}
        </p>
        <Link href="/">
          <TezButton variant="secondary">{t("errors.not_found.home", locale)}</TezButton>
        </Link>
      </div>
    </Panel>
  );
}
