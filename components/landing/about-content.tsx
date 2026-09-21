import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { SIGNUP_HREF } from "./constants";

const COPY: Record<
  Locale,
  {
    kicker: string;
    titleA: string;
    titleB: string;
    body: string;
    meta: string;
    principles: Array<[string, string]>;
    valuesKicker: string;
    values: Array<[string, string]>;
    language: string;
    languageBody: string;
    final: string;
    finalBody: string;
    cta: string;
  }
> = {
  en: {
    kicker: "About TezHR",
    titleA: "Hiring, as it",
    titleB: "should be.",
    body: "TezHR has one job: help recruiting teams in Uzbekistan turn a crowded applicant queue into a clear, evidence-backed next step.",
    meta: "Since 2026 · Tashkent",
    principles: [
      [
        "Make the queue readable.",
        "CVs become structured profiles with scores, strengths, gaps, and the source evidence a recruiter can inspect.",
      ],
      [
        "Take every language seriously.",
        "Russian, Uzbek in Cyrillic or Latin, and English belong in one consistent screening workflow.",
      ],
      [
        "Keep people in charge.",
        "AI supports the review. Recruiters read, compare, invite, reject, and remain responsible for the decision.",
      ],
    ],
    valuesKicker: "What we believe",
    values: [
      [
        "Useful speed",
        "Automation should remove repetitive reading without hiding the evidence behind the result.",
      ],
      [
        "Honest algorithms",
        "A score needs an explanation. If the evidence is thin, the product should make that visible.",
      ],
      [
        "Made for Uzbekistan",
        "Local languages, hiring channels, payment rails, and working habits are product requirements, not afterthoughts.",
      ],
    ],
    language: "RU · UZ · EN",
    languageBody: "Every language taken seriously.",
    final: "Give HR back the time lost inside PDFs.",
    finalBody: "Start with 14 days, 3 active jobs, and 50 CV analyses. No card required.",
    cta: "Start free",
  },
  ru: {
    kicker: "О TezHR",
    titleA: "Найм, каким он",
    titleB: "должен быть.",
    body: "У TezHR одна задача: помочь командам найма в Узбекистане превратить переполненную очередь откликов в понятный следующий шаг, подтверждённый фактами.",
    meta: "С 2026 года · Ташкент",
    principles: [
      [
        "Сделать очередь понятной.",
        "CV превращаются в структурированные профили с оценкой, сильными сторонами, пробелами и проверяемыми фрагментами резюме.",
      ],
      [
        "Серьёзно относиться к каждому языку.",
        "Русский, узбекский на кириллице или латинице и английский работают в одном процессе скрининга.",
      ],
      [
        "Оставить решение людям.",
        "AI помогает с разбором. Рекрутер читает, сравнивает, приглашает, отказывает и отвечает за итоговое решение.",
      ],
    ],
    valuesKicker: "Во что мы верим",
    values: [
      [
        "Полезная скорость",
        "Автоматизация должна убирать повторяющееся чтение, но не скрывать доказательства результата.",
      ],
      [
        "Честные алгоритмы",
        "Оценке нужно объяснение. Если доказательств мало, продукт обязан это показать.",
      ],
      [
        "Сделано для Узбекистана",
        "Местные языки, каналы найма, способы оплаты и рабочие привычки — требования к продукту, а не дополнения.",
      ],
    ],
    language: "RU · UZ · EN",
    languageBody: "Каждый язык важен.",
    final: "Вернуть HR время, потерянное внутри PDF.",
    finalBody: "Начните с 14 дней, 3 активных вакансий и 50 анализов CV. Карта не нужна.",
    cta: "Начать бесплатно",
  },
  uz: {
    kicker: "TezHR haqida",
    titleA: "Yollash qanday",
    titleB: "bo‘lishi kerak.",
    body: "TezHRning bitta vazifasi bor: O‘zbekistondagi yollash jamoalariga arizalar navbatini dalillarga tayangan aniq keyingi qadamga aylantirishga yordam berish.",
    meta: "2026-yildan · Toshkent",
    principles: [
      [
        "Navbatni tushunarli qilish.",
        "CVlar ball, kuchli tomonlar, bo‘shliqlar va tekshiriladigan manba dalillari bilan tuzilgan profilga aylanadi.",
      ],
      [
        "Har bir tilga jiddiy qarash.",
        "Rus, kirill yoki lotindagi o‘zbek va ingliz tillari bitta skrining jarayonida ishlaydi.",
      ],
      [
        "Qarorni insonda qoldirish.",
        "AI tahlilga yordam beradi. Rekruter o‘qiydi, solishtiradi, taklif qiladi, rad etadi va yakuniy qaror uchun javob beradi.",
      ],
    ],
    valuesKicker: "Biz nimaga ishonamiz",
    values: [
      [
        "Foydali tezlik",
        "Avtomatlashtirish takroriy o‘qishni kamaytirishi, lekin natija ortidagi dalilni yashirmasligi kerak.",
      ],
      [
        "Halol algoritmlar",
        "Har bir ball izohga ega bo‘lishi kerak. Dalil yetarli bo‘lmasa, mahsulot buni ko‘rsatadi.",
      ],
      [
        "O‘zbekiston uchun",
        "Mahalliy tillar, yollash kanallari, to‘lov usullari va ish odatlari — mahsulotning asosiy talablari.",
      ],
    ],
    language: "RU · UZ · EN",
    languageBody: "Har bir til jiddiy qabul qilinadi.",
    final: "HRga PDFlar ichida yo‘qotgan vaqtini qaytarish.",
    finalBody: "14 kun, 3 ta faol vakansiya va 50 ta CV tahlili bilan boshlang. Karta kerak emas.",
    cta: "Bepul boshlash",
  },
};

export async function AboutContent() {
  const { locale } = await getT();
  const c = COPY[locale];
  return (
    <main id="main">
      <section className="craft-page-hero craft-about-hero craft-paper-blue">
        <div className="craft-container">
          <p className="craft-kicker">{c.kicker}</p>
          <h1 className="craft-display">
            {c.titleA}
            <br />
            {c.titleB}
          </h1>
          <p className="craft-lede">{c.body}</p>
          <p className="craft-page-meta">{c.meta}</p>
        </div>
        <Image
          className="craft-skyline craft-skyline-page"
          src="/marketing/tashkent-skyline.png"
          alt=""
          width={2172}
          height={724}
          priority
          sizes="100vw"
        />
      </section>

      <section className="craft-page-body craft-paper">
        <div className="craft-container">
          <ol className="craft-numbered-list">
            {c.principles.map(([title, body], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="craft-values craft-paper-sage">
        <div className="craft-container">
          <p className="craft-kicker">{c.valuesKicker}</p>
          <ul className="craft-values-list">
            {c.values.map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="craft-language craft-paper-sun">
        <div className="craft-container craft-language-centered">
          <h2 className="craft-display craft-display-small">{c.language}</h2>
          <p>{c.languageBody}</p>
        </div>
      </section>

      <section className="craft-final craft-paper-ink">
        <div className="craft-container craft-final-grid">
          <div>
            <h2 className="craft-display craft-display-medium">{c.final}</h2>
            <p>{c.finalBody}</p>
          </div>
          <div className="craft-actions craft-actions-end">
            <Link
              href={`${SIGNUP_HREF}?utm_source=about&utm_section=final`}
              className="craft-button craft-button-coral"
            >
              {c.cta}
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
