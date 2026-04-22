import type { Metadata } from "next";
import { getLocale, t } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Company suspended",
};

export default async function SuspendedPage() {
  const locale = await getLocale();

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="bg-surface shadow-level-1 w-full max-w-md space-y-4 rounded-xl p-8 text-center">
        <h1 className="text-on-surface text-xl font-semibold">{t("suspended.title", locale)}</h1>
        <p className="text-on-surface-variant text-sm">{t("suspended.body", locale)}</p>
        <div className="flex flex-col gap-2 pt-2">
          <a
            href="mailto:support@tezhr.uz"
            className="text-primary text-sm font-medium hover:underline"
          >
            {t("suspended.contact", locale)}
          </a>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full">
              {t("suspended.sign_out", locale)}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
