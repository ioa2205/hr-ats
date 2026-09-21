"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

type Story = {
  title: TranslationKey;
  showTrial?: boolean;
};

function storyForPath(pathname: string): Story {
  if (pathname.startsWith("/onboarding/create")) return { title: "auth.story.company" };
  if (pathname === "/onboarding") return { title: "auth.story.onboarding" };
  if (pathname.startsWith("/auth/accept-invite")) return { title: "auth.story.invitation" };
  if (pathname.startsWith("/auth/signup-phone")) return { title: "auth.story.phone" };
  if (pathname.startsWith("/auth/signup")) {
    return { title: "auth.story.signup", showTrial: true };
  }
  if (pathname.startsWith("/auth/verify")) return { title: "auth.story.verify" };
  if (pathname.startsWith("/auth/reset")) return { title: "auth.story.reset" };
  return { title: "auth.story.login" };
}

export function AccountStory() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const story = storyForPath(pathname);

  return (
    <aside
      className="account-story relative isolate min-h-[210px] overflow-hidden bg-[#a8d8ec] lg:sticky lg:top-[68px] lg:min-h-[calc(100dvh-68px)]"
      aria-hidden="true"
    >
      <Image
        src="/account-flow/editorial-backdrop.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 64vw, 100vw"
        className="object-cover object-[58%_bottom]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(174,221,240,0.34),transparent_68%)]" />

      <div className="relative z-10 flex h-full min-h-[210px] flex-col items-start px-6 pt-8 sm:px-10 sm:pt-10 lg:min-h-[calc(100dvh-68px)] lg:px-[clamp(3rem,5.4vw,6.5rem)] lg:pt-[clamp(5rem,12vh,8.5rem)]">
        <h2 className="account-story-title max-w-[760px] text-[clamp(2.35rem,5.6vw,6.6rem)] leading-[0.94] tracking-[-0.045em] text-[#101615]">
          {t(story.title)}
        </h2>
        {story.showTrial && (
          <span className="mt-5 inline-flex rounded-full bg-[#f3cd68] px-4 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#19170e] uppercase shadow-sm lg:mt-8 lg:px-5 lg:text-[13px]">
            {t("landing.meta.free_trial_badge")}
          </span>
        )}
      </div>
    </aside>
  );
}
