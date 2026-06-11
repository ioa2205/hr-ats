"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthPanel } from "@/components/auth/auth-panel";
import { useTranslation } from "@/lib/i18n/provider";

export default function AcceptInviteNotFound() {
  const { t } = useTranslation();
  return (
    <AuthPanel
      eyebrow={<AlertCircle className="inline h-3 w-3" aria-hidden="true" />}
      title={t("invite.invalid")}
      subtitle={t("invite.invalid_desc")}
    >
      <Button asChild variant="secondary" size="lg" fullWidth>
        <Link href="/auth/login">{t("auth.back_to_login")}</Link>
      </Button>
    </AuthPanel>
  );
}
