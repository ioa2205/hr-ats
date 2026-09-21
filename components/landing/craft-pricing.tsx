import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { SIGNUP_HREF } from "./constants";

type PricingCopy = {
  title: string;
  headline: string;
  lede: string;
  trial: string;
  trialDuration: string;
  trialPrice: string;
  trialNote: string;
  trialFeatures: string[];
  pro: string;
  proPrice: string;
  proNote: string;
  proFeatures: string[];
  start: string;
  request: string;
  compare: string;
  feature: string;
  rows: Array<[string, string, string]>;
  faq: string;
  faqs: Array<[string, string]>;
  final: string;
};

const COPY: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing",
    headline: "Start today. Pro when you’re ready.",
    lede: "Try TezHR for 14 days. No card. No automatic charges.",
    trial: "Trial",
    trialDuration: "14 days",
    trialPrice: "0 UZS",
    trialNote: "No card. No commitment.",
    trialFeatures: [
      "Up to 3 active jobs",
      "50 AI CV analyses",
      "Evidence-based ranking in RU · UZ · EN",
      "Interview questions and scheduling",
    ],
    pro: "Pro",
    proPrice: "1,500,000 UZS / month",
    proNote: "Available by request from the Billing page.",
    proFeatures: [
      "Unlimited active jobs",
      "500 AI CV analyses per month",
      "Team seats and roles",
      "Active sourcing and interview workflows",
    ],
    start: "Start free",
    request: "Request Pro",
    compare: "Compare plans",
    feature: "Feature",
    rows: [
      ["Active jobs", "Up to 3", "Unlimited"],
      ["AI CV analyses", "50 during trial", "500 / month"],
      ["CV languages", "RU · UZ · EN", "RU · UZ · EN"],
      ["AI interview-question sets", "10", "Unlimited"],
      ["Interview bookings", "3", "Unlimited"],
      ["Workspace access after plan ends", "Read-only", "Depends on subscription status"],
    ],
    faq: "Frequently asked",
    faqs: [
      [
        "What happens when the trial ends?",
        "The workspace becomes read-only. Your jobs and candidate records remain available, and there is no automatic charge.",
      ],
      [
        "How do I activate Pro?",
        "Create your workspace, then request Pro from Settings → Billing. The TezHR team reviews the request and follows up on activation and payment.",
      ],
      [
        "Which CV languages are supported?",
        "Russian, Uzbek in Cyrillic or Latin, and English are supported in the same screening workflow.",
      ],
      [
        "Can I cancel?",
        "Yes. Owners can send a cancellation request from Settings → Billing. The request is recorded for the TezHR team to process.",
      ],
      [
        "How is candidate data protected?",
        "Each company’s data is kept separate. CVs are stored privately, with access controlled by team roles. Learn more on the Security page.",
      ],
    ],
    final: "Try TezHR free",
  },
  ru: {
    title: "Тарифы",
    headline: "Начните сегодня. Pro — когда будете готовы.",
    lede: "Попробуйте TezHR 14 дней. Без карты и автоматических списаний.",
    trial: "Пробный период",
    trialDuration: "14 дней",
    trialPrice: "0 сум",
    trialNote: "Без карты. Без обязательств.",
    trialFeatures: [
      "До 3 активных вакансий",
      "50 AI-анализов CV",
      "Рейтинг с доказательствами на RU · UZ · EN",
      "Вопросы и планирование интервью",
    ],
    pro: "Pro",
    proPrice: "1 500 000 сум / месяц",
    proNote: "Доступен по запросу со страницы Billing.",
    proFeatures: [
      "Без лимита активных вакансий",
      "500 AI-анализов CV в месяц",
      "Участники команды и роли",
      "Активный поиск и интервью",
    ],
    start: "Начать бесплатно",
    request: "Запросить Pro",
    compare: "Сравнить планы",
    feature: "Возможность",
    rows: [
      ["Активные вакансии", "До 3", "Без лимита"],
      ["AI-анализы CV", "50 за пробный период", "500 / месяц"],
      ["Языки CV", "RU · UZ · EN", "RU · UZ · EN"],
      ["Наборы вопросов для интервью", "10", "Без лимита"],
      ["Бронирования интервью", "3", "Без лимита"],
      ["Доступ после окончания плана", "Только чтение", "Зависит от статуса подписки"],
    ],
    faq: "Частые вопросы",
    faqs: [
      [
        "Что будет после пробного периода?",
        "Рабочее пространство перейдёт в режим чтения. Вакансии и кандидаты останутся доступны, автоматического списания не будет.",
      ],
      [
        "Как включить Pro?",
        "Создайте рабочее пространство и отправьте запрос в Settings → Billing. Команда TezHR проверит запрос и свяжется по активации и оплате.",
      ],
      [
        "Какие языки CV поддерживаются?",
        "Русский, узбекский на кириллице или латинице и английский поддерживаются в одном процессе скрининга.",
      ],
      [
        "Можно отменить Pro?",
        "Да. Владелец отправляет запрос на отмену из Settings → Billing. Запрос фиксируется для обработки командой TezHR.",
      ],
      [
        "Как защищены данные кандидатов?",
        "Данные каждой компании хранятся отдельно. Резюме доступны только участникам с нужными правами. Подробнее — на странице «Безопасность».",
      ],
    ],
    final: "Попробуйте TezHR бесплатно",
  },
  uz: {
    title: "Narxlar",
    headline: "Bugun boshlang. Tayyor bo‘lganda Pro.",
    lede: "TezHRni 14 kun sinab ko‘ring. Kartasiz va avtomatik to‘lovlarsiz.",
    trial: "Sinov",
    trialDuration: "14 kun",
    trialPrice: "0 so‘m",
    trialNote: "Kartasiz. Majburiyatsiz.",
    trialFeatures: [
      "3 tagacha faol vakansiya",
      "50 ta AI CV tahlili",
      "RU · UZ · EN tillarida dalilli reyting",
      "Suhbat savollari va rejalashtirish",
    ],
    pro: "Pro",
    proPrice: "1 500 000 so‘m / oy",
    proNote: "Billing sahifasidan so‘rov orqali yoqiladi.",
    proFeatures: [
      "Cheksiz faol vakansiyalar",
      "Oyiga 500 ta AI CV tahlili",
      "Jamoa a’zolari va rollar",
      "Faol qidiruv va suhbat jarayonlari",
    ],
    start: "Bepul boshlash",
    request: "Pro so‘rash",
    compare: "Rejalarni solishtirish",
    feature: "Imkoniyat",
    rows: [
      ["Faol vakansiyalar", "3 tagacha", "Cheksiz"],
      ["AI CV tahlillari", "Sinov davomida 50", "Oyiga 500"],
      ["CV tillari", "RU · UZ · EN", "RU · UZ · EN"],
      ["AI suhbat savollari to‘plami", "10", "Cheksiz"],
      ["Suhbat bronlari", "3", "Cheksiz"],
      ["Reja tugagandan keyingi kirish", "Faqat o‘qish", "Obuna holatiga bog‘liq"],
    ],
    faq: "Ko‘p so‘raladigan savollar",
    faqs: [
      [
        "Sinov tugagach nima bo‘ladi?",
        "Ish maydoni faqat o‘qish rejimiga o‘tadi. Vakansiyalar va nomzodlar saqlanadi, avtomatik to‘lov bo‘lmaydi.",
      ],
      [
        "Pro qanday yoqiladi?",
        "Ish maydonini yarating va Settings → Billing orqali Pro so‘rovini yuboring. TezHR jamoasi so‘rovni ko‘rib, faollashtirish va to‘lov bo‘yicha bog‘lanadi.",
      ],
      [
        "Qaysi CV tillari qo‘llanadi?",
        "Rus, kirill yoki lotindagi o‘zbek va ingliz tillari bitta skrining jarayonida qo‘llanadi.",
      ],
      [
        "Prodan voz kechish mumkinmi?",
        "Ha. Egasi Settings → Billing orqali bekor qilish so‘rovini yuboradi. So‘rov TezHR jamoasi ishlashi uchun qayd etiladi.",
      ],
      [
        "Nomzod ma’lumotlari qanday himoyalanadi?",
        "Har bir kompaniya ma’lumotlari alohida saqlanadi. CVlarni faqat tegishli huquqqa ega jamoa a’zolari ko‘ra oladi. Batafsil «Xavfsizlik» sahifasida.",
      ],
    ],
    final: "TezHRni bepul sinab ko‘ring",
  },
};

export async function CraftPricing() {
  const { locale } = await getT();
  const c = COPY[locale];
  const trialHref = `${SIGNUP_HREF}?utm_source=pricing&utm_section=trial`;
  const proHref = `${SIGNUP_HREF}?intent=pro&utm_source=pricing&utm_section=pro`;

  return (
    <main id="main">
      <section
        className="craft-pricing-hero craft-page-hero craft-paper"
        aria-labelledby="pricing-title"
      >
        <div className="craft-container">
          <p className="craft-kicker">{c.title}</p>
          <h1 id="pricing-title" className="craft-display">
            {c.headline}
          </h1>
          <p className="craft-lede">{c.lede}</p>
        </div>
        <Image
          className="craft-pricing-skyline"
          src="/marketing/tashkent-skyline.png"
          alt=""
          width={2172}
          height={724}
          priority
          sizes="(min-width: 800px) 58vw, 100vw"
        />
      </section>

      <section className="craft-plan-split" aria-label={c.compare}>
        <article className="craft-plan craft-plan-trial craft-paper-sun">
          <div className="craft-plan-inner">
            <h2>{c.trial}</h2>
            <p className="craft-plan-duration">{c.trialDuration}</p>
            <strong>{c.trialPrice}</strong>
            <p>{c.trialNote}</p>
            <ul>
              {c.trialFeatures.map((item) => (
                <li key={item}>
                  <Check aria-hidden size={17} />
                  {item}
                </li>
              ))}
            </ul>
            <Link className="craft-button craft-button-coral" href={trialHref}>
              {c.start}
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>
        </article>
        <article className="craft-plan craft-plan-pro craft-paper-sage">
          <div className="craft-plan-inner">
            <h2>{c.pro}</h2>
            <strong>{c.proPrice}</strong>
            <p>{c.proNote}</p>
            <ul>
              {c.proFeatures.map((item) => (
                <li key={item}>
                  <Check aria-hidden size={17} />
                  {item}
                </li>
              ))}
            </ul>
            <Link className="craft-button craft-button-outline" href={proHref}>
              {c.request}
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>
        </article>
      </section>

      <section className="craft-compare craft-paper">
        <div className="craft-container">
          <h2 className="craft-heading craft-heading-large">{c.compare}</h2>
          <div className="craft-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{c.feature}</th>
                  <th>{c.trial}</th>
                  <th>{c.pro}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map(([feature, trial, pro]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>{trial}</td>
                    <td>{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="craft-faq craft-paper-blue">
        <div className="craft-container craft-faq-grid">
          <h2 className="craft-display craft-display-medium">{c.faq}</h2>
          <div>
            {c.faqs.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <span aria-hidden>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="craft-final craft-paper-ink">
        <div className="craft-container craft-final-grid">
          <h2 className="craft-display craft-display-medium">{c.final}</h2>
          <div className="craft-actions craft-actions-end">
            <Link className="craft-button craft-button-coral" href={trialHref}>
              {c.start}
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
