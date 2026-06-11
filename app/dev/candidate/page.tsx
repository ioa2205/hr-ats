import { notFound } from "next/navigation";
import { getMessages } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import { PublicShell } from "@/components/candidate/public-shell";
import { ApplyForm } from "@/components/candidate/apply-form";
import { ClosedState } from "@/components/candidate/closed-state";
import { InterviewClient } from "@/components/candidate/interview-client";
import { SuccessPreview } from "./success-preview";

/**
 * Gated visual-QA harness for the Phase 8 candidate-facing surfaces. Renders
 * the apply + interview surfaces with mock data inside the real PublicShell so
 * RU/UZ/EN × light/dark × phone/tablet/desktop can be driven by Playwright
 * (tests/e2e/candidate.spec.ts) without seeding Supabase.
 *
 * Query params: ?view=<view>&locale=ru|uz|en&theme=light|dark
 */

const VIEWS = [
  "apply",
  "apply-no-req",
  "success",
  "closed",
  "interview",
  "interview-booked",
  "interview-declined",
] as const;
type View = (typeof VIEWS)[number];

const REQUIREMENTS: HardRequirement[] = [
  {
    id: "has_degree",
    label_ru: "Высшее образование в смежной области",
    label_uz: "Tegishli sohada oliy ma'lumot",
    label_en: "University degree in a related field",
    type: "boolean",
    min_value: null,
    order: 0,
  } as HardRequirement,
  {
    id: "experience_years",
    label_ru: "Опыт коммерческой разработки (полных лет)",
    label_uz: "Tijoriy dasturlash tajribasi (to'liq yillar)",
    label_en: "Years of commercial development experience",
    type: "number",
    min_value: 3,
    order: 1,
  } as HardRequirement,
];

const DESCRIPTION = `## О роли
Мы ищем внимательного и быстрого специалиста, который любит доводить дело до конца и работать в команде.

### Обязанности
- Разрабатывать и поддерживать клиентские интерфейсы
- Участвовать в код-ревью и улучшать качество кода
- Работать с продуктовой командой над новыми функциями

### Что мы предлагаем
1. Гибкий график и удалённую работу
2. Обучение за счёт компании
3. Дружную команду профессионалов`;

const POSTING = {
  id: "preview-posting",
  title: "Senior Frontend Engineer — продуктовая команда (RU/UZ/EN)",
  description: DESCRIPTION,
  public_token: "preview-token",
  hard_requirements: REQUIREMENTS,
};

const COMPANY = { name: "Tashkent Digital Solutions LLC", logo_url: null };

function buildInterview(status: "pending" | "booked" | "declined") {
  return {
    id: "preview-interview",
    public_token: "preview-token",
    status,
    duration_minutes: 30 as const,
    location_kind: "google_meet" as const,
    location_detail: null,
    hr_message:
      status === "pending"
        ? "Здравствуйте! Нам понравилось ваше резюме. Выберите удобное время для короткого разговора с командой."
        : null,
    candidate_note: null,
    expires_at: "2027-12-31T12:00:00.000Z",
    booked_slot_id: status === "booked" ? "slot-1" : null,
    booked_at: status === "booked" ? "2027-01-10T09:00:00.000Z" : null,
    booked_start_at: status === "booked" ? "2027-01-15T10:00:00.000Z" : null,
    slots: [
      { id: "slot-1", start_at: "2027-01-15T10:00:00.000Z", position: 0 },
      { id: "slot-2", start_at: "2027-01-16T14:30:00.000Z", position: 1 },
      { id: "slot-3", start_at: "2027-01-17T09:00:00.000Z", position: 2 },
    ],
    candidate_first_name: "Алишер",
    job: {
      title: POSTING.title,
      title_ru: POSTING.title,
      title_uz: POSTING.title,
      title_en: POSTING.title,
    },
    company: { name: COMPANY.name, logo_url: null, default_locale: "ru" },
  };
}

export default async function CandidatePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.ENABLE_DESIGN_REVIEW !== "1" &&
    process.env.PLAYWRIGHT_DEV !== "1"
  ) {
    notFound();
  }

  const sp = await searchParams;
  const view = (VIEWS.includes(sp.view as View) ? sp.view : "apply") as View;
  const locale = (["ru", "uz", "en"].includes(sp.locale as string) ? sp.locale : "ru") as Locale;
  const theme = sp.theme === "dark" ? "dark" : "light";
  const messages = getMessages(locale);
  const width = view.startsWith("interview") ? "md" : "lg";

  let content: React.ReactNode;
  if (view === "apply" || view === "apply-no-req") {
    content = (
      <ApplyForm
        posting={view === "apply-no-req" ? { ...POSTING, hard_requirements: [] } : POSTING}
        company={COMPANY}
        locale={locale}
        translations={messages}
        turnstileSiteKey=""
      />
    );
  } else if (view === "success") {
    content = <SuccessPreview locale={locale} />;
  } else if (view === "closed") {
    content = <ClosedState locale={locale} />;
  } else if (view === "interview") {
    content = (
      <InterviewClient
        initial={buildInterview("pending")}
        jobTitle={POSTING.title}
        locale={locale}
      />
    );
  } else if (view === "interview-booked") {
    content = (
      <InterviewClient
        initial={buildInterview("booked")}
        jobTitle={POSTING.title}
        locale={locale}
      />
    );
  } else {
    content = (
      <InterviewClient
        initial={buildInterview("declined")}
        jobTitle={POSTING.title}
        locale={locale}
      />
    );
  }

  return (
    <div className={theme === "dark" ? "theme-dark" : undefined} data-candidate-preview={view}>
      <TranslationsProvider locale={locale} messages={messages}>
        <PublicShell width={width} locale={locale}>
          {content}
        </PublicShell>
      </TranslationsProvider>
    </div>
  );
}
