import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { getLocale, t } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("errors.not_found.title", locale)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-on-surface-variant text-center text-sm">
            {t("errors.not_found.description", locale)}
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={user ? "/hr/dashboard" : "/"}>{t("errors.not_found.home", locale)}</Link>
          </Button>
          {user && (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="lg" className="w-full">
                {t("auth.sign_out", locale)}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
