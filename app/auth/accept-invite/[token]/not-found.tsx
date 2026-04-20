"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { AuthPanel } from "@/components/auth/auth-panel";
import { useTranslation } from "@/lib/i18n/provider";

export default function AcceptInviteNotFound() {
  const { t } = useTranslation();
  return (
    <AuthPanel
      eyebrow={<AlertCircle className="inline h-3 w-3" />}
      title={t("invite.invalid")}
      subtitle={t("invite.invalid_desc")}
    >
      <Link href="/auth/login" className="block">
        <TezButton
          variant="secondary"
          size="lg"
          className="h-11 w-full justify-center text-[13.5px] font-semibold"
        >
          {t("auth.back_to_login")}
        </TezButton>
      </Link>
    </AuthPanel>
  );
}
