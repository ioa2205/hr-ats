import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { SIGNUP_HREF } from "./constants";

type HomeCopy = {
  heroKicker: string;
  heroA: string;
  heroB: string;
  heroBody: string;
  demo: string;
  pathTitle: string;
  path: string[];
  evidenceKicker: string;
  evidenceTitleA: string;
  evidenceTitleB: string;
  evidenceBody: string;
  example: string;
  role: string;
  roleFit: string;
  experience: string;
  languages: string;
  shortlist: string;
  workflowKicker: string;
  workflowTitle: string;
  workflowBody: string;
  humanTitleA: string;
  humanTitleB: string;
  humanBody: string;
  localTitle: string;
  localBody: string;
  sourcingKicker: string;
  sourcingTitleA: string;
  sourcingTitleB: string;
  sourcingBody: string;
  sources: Array<{ title: string; body: string }>;
  sourceCta: string;
  sourceMore: string;
  finalA: string;
  finalB: string;
  finalBody: string;
  start: string;
  pricing: string;
};

const COPY: Record<Locale, HomeCopy> = {
  en: {
    heroKicker: "AI-assisted ATS · built in Tashkent",
    heroA: "Find the signal",
    heroB: "in every CV.",
    heroBody:
      "Collect applicants, compare the evidence, and move the right people forward — in Russian, Uzbek, and English.",
    demo: "Product preview",
    pathTitle: "One system. One hiring path.",
    path: ["Vacancy", "Apply", "Rank", "Interview"],
    evidenceKicker: "Evidence, not intuition",
    evidenceTitleA: "Signals,",
    evidenceTitleB: "not guesses.",
    evidenceBody: "See the CV evidence behind every score before you make a decision.",
    example: "Example profile · demo data",
    role: "Product manager",
    roleFit: "Role fit",
    experience: "Experience",
    languages: "Languages",
    shortlist: "Move to shortlist",
    workflowKicker: "The hiring route",
    workflowTitle: "From open role to a clear next step.",
    workflowBody:
      "TezHR keeps the work in one path: define what matters, share the application link, review structured evidence, and invite the people you choose.",
    humanTitleA: "AI brings the evidence.",
    humanTitleB: "You make the decision.",
    humanBody:
      "Scores support judgment; they do not replace it. Recruiters can read the original CV, inspect strengths and gaps, add notes, and decide what happens next.",
    localTitle: "Built for Uzbekistan.",
    localBody: "Russian, Uzbek in Cyrillic or Latin, and English are handled in the same workflow.",
    sourcingKicker: "Active sourcing",
    sourcingTitleA: "The right candidate may not",
    sourcingTitleB: "be in your inbox yet.",
    sourcingBody:
      "Search your existing candidate pool, a connected hh.uz account, and configured public Telegram sources from the role you are already hiring for.",
    sources: [
      { title: "Your pool", body: "Revisit people who already applied to your company." },
      { title: "hh.uz", body: "Search through the connected employer account." },
      { title: "Telegram", body: "Review candidates from configured public channels." },
    ],
    sourceCta: "Start sourcing free",
    sourceMore: "How sourcing works",
    finalA: "AI advises.",
    finalB: "You decide.",
    finalBody: "Start with a 14-day trial: 3 active jobs and 50 CV analyses. No card required.",
    start: "Start free",
    pricing: "See pricing",
  },
  ru: {
    heroKicker: "ATS с AI · сделано в Ташкенте",
    heroA: "Найдите главное",
    heroB: "в каждом резюме.",
    heroBody:
      "Собирайте отклики, сравнивайте факты и двигайте подходящих людей дальше — на русском, узбекском и английском.",
    demo: "Превью продукта",
    pathTitle: "Одна система. Один путь найма.",
    path: ["Вакансия", "Отклик", "Рейтинг", "Интервью"],
    evidenceKicker: "Факты вместо интуиции",
    evidenceTitleA: "Сигналы,",
    evidenceTitleB: "а не догадки.",
    evidenceBody: "До решения вы видите, на каких фрагментах CV основана оценка.",
    example: "Пример профиля · демоданные",
    role: "Продакт-менеджер",
    roleFit: "Соответствие роли",
    experience: "Опыт",
    languages: "Языки",
    shortlist: "В шорт-лист",
    workflowKicker: "Маршрут найма",
    workflowTitle: "От открытой роли — к понятному следующему шагу.",
    workflowBody:
      "TezHR соединяет работу в один путь: задайте критерии, поделитесь ссылкой, изучите структурированные факты и пригласите выбранных людей.",
    humanTitleA: "AI собирает факты.",
    humanTitleB: "Решение принимаете вы.",
    humanBody:
      "Оценка помогает сориентироваться, но не заменяет решение рекрутера. Откройте исходное CV, проверьте сильные стороны и пробелы, добавьте заметки и выберите следующий шаг.",
    localTitle: "Сделано для Узбекистана.",
    localBody: "Русский, узбекский на кириллице или латинице и английский — в одном процессе.",
    sourcingKicker: "Активный поиск",
    sourcingTitleA: "Нужного кандидата может",
    sourcingTitleB: "ещё не быть во входящих.",
    sourcingBody:
      "Ищите по своей базе кандидатов, подключённому аккаунту hh.uz и настроенным публичным Telegram-источникам прямо из вакансии.",
    sources: [
      { title: "Ваша база", body: "Вернитесь к тем, кто уже откликался в вашу компанию." },
      { title: "hh.uz", body: "Ищите через подключённый аккаунт работодателя." },
      { title: "Telegram", body: "Просматривайте кандидатов из настроенных публичных каналов." },
    ],
    sourceCta: "Начать поиск бесплатно",
    sourceMore: "Как работает поиск",
    finalA: "AI советует.",
    finalB: "Решаете вы.",
    finalBody:
      "Начните с 14-дневного пробного периода: 3 активные вакансии и 50 анализов CV. Карта не нужна.",
    start: "Начать бесплатно",
    pricing: "Посмотреть цены",
  },
  uz: {
    heroKicker: "AI yordamidagi ATS · Toshkentda yaratilgan",
    heroA: "Har bir CVdagi",
    heroB: "asosiy signalni toping.",
    heroBody:
      "Arizalarni yig‘ing, dalillarni solishtiring va mos nomzodlarni keyingi bosqichga o‘tkazing — rus, o‘zbek va ingliz tillarida.",
    demo: "Mahsulot namoyishi",
    pathTitle: "Bitta tizim. Bitta yollash yo‘li.",
    path: ["Vakansiya", "Ariza", "Reyting", "Suhbat"],
    evidenceKicker: "Taxmin emas, dalil",
    evidenceTitleA: "Aniq signal,",
    evidenceTitleB: "taxmin emas.",
    evidenceBody: "Qaror qilishdan oldin har bir ball ortidagi CV dalillarini ko‘ring.",
    example: "Namuna profil · demo ma’lumot",
    role: "Mahsulot menejeri",
    roleFit: "Rolga moslik",
    experience: "Tajriba",
    languages: "Tillar",
    shortlist: "Qisqa ro‘yxatga",
    workflowKicker: "Yollash yo‘li",
    workflowTitle: "Ochiq roldan aniq keyingi qadamgacha.",
    workflowBody:
      "TezHR ishni bir yo‘lda birlashtiradi: mezonlarni belgilang, ariza havolasini ulashing, dalillarni ko‘ring va tanlagan nomzodlarni taklif qiling.",
    humanTitleA: "AI dalillarni beradi.",
    humanTitleB: "Qarorni siz qilasiz.",
    humanBody:
      "Ball qarorga yordam beradi, lekin rekruter o‘rnini bosmaydi. Asl CVni o‘qing, kuchli tomonlar va bo‘shliqlarni tekshiring, qayd qo‘shing va keyingi qadamni tanlang.",
    localTitle: "O‘zbekiston uchun yaratilgan.",
    localBody: "Rus, kirill yoki lotindagi o‘zbek va ingliz tillari — bitta jarayonda.",
    sourcingKicker: "Faol qidiruv",
    sourcingTitleA: "Kerakli nomzod hali",
    sourcingTitleB: "arizalar ichida bo‘lmasligi mumkin.",
    sourcingBody:
      "Mavjud nomzodlar bazasi, ulangan hh.uz ish beruvchi akkaunti va sozlangan ochiq Telegram manbalarini vakansiyaning o‘zidan qidiring.",
    sources: [
      {
        title: "Sizning bazangiz",
        body: "Kompaniyangizga avval ariza bergan nomzodlarga qayting.",
      },
      { title: "hh.uz", body: "Ulangan ish beruvchi akkaunti orqali qidiring." },
      { title: "Telegram", body: "Sozlangan ochiq kanallardagi nomzodlarni ko‘ring." },
    ],
    sourceCta: "Bepul qidirishni boshlash",
    sourceMore: "Qidiruv qanday ishlaydi",
    finalA: "AI maslahat beradi.",
    finalB: "Siz qaror qilasiz.",
    finalBody:
      "14 kunlik sinovdan boshlang: 3 ta faol vakansiya va 50 ta CV tahlili. Karta kerak emas.",
    start: "Bepul boshlash",
    pricing: "Narxlarni ko‘rish",
  },
};

const STEPS = [
  { number: "01", titleKey: "landing.how.step1_title", icon: Sparkles },
  { number: "02", titleKey: "landing.how.step2_title", icon: ArrowRight },
  { number: "03", titleKey: "landing.how.step3_title", icon: Check },
] as const;

export async function CraftHome() {
  const { locale, t } = await getT();
  const c = COPY[locale];

  return (
    <main id="main">
      <section className="craft-hero craft-paper-blue" aria-labelledby="home-title">
        <div className="craft-container craft-hero-grid">
          <div className="craft-hero-copy">
            <p className="craft-kicker">{c.heroKicker}</p>
            <h1 id="home-title" className="craft-display">
              {c.heroA}
              <br />
              {c.heroB}
            </h1>
            <p className="craft-lede">{c.heroBody}</p>
            <div className="craft-actions">
              <Link
                className="craft-button craft-button-sun"
                href={`${SIGNUP_HREF}?utm_source=landing&utm_section=hero`}
              >
                {c.start} <ArrowRight aria-hidden size={17} />
              </Link>
              <Link className="craft-text-link" href="/pricing">
                {c.pricing} <span aria-hidden>↗</span>
              </Link>
            </div>
          </div>
          <div className="craft-ranking-stack" aria-label={c.demo}>
            <span className="craft-note craft-note-rotate-left">CV</span>
            <span className="craft-note craft-note-rotate-right">CV</span>
            <div className="craft-ranking-sheet">
              <div className="craft-ranking-head">
                <span className="craft-avatar" aria-hidden>
                  DR
                </span>
                <div>
                  <span className="craft-demo-label">{c.example}</span>
                  <strong>Diyora R.</strong>
                  <span>{c.role}</span>
                </div>
                <span className="craft-score">94</span>
              </div>
              <div className="craft-bars" aria-hidden="true">
                <span>
                  <i style={{ width: "92%" }} />
                </span>
                <span>
                  <i style={{ width: "86%" }} />
                </span>
                <span>
                  <i style={{ width: "90%" }} />
                </span>
              </div>
            </div>
          </div>
        </div>
        <Image
          className="craft-skyline craft-skyline-hero"
          src="/marketing/tashkent-skyline.png"
          width={2172}
          height={724}
          priority
          sizes="100vw"
          alt=""
        />
      </section>

      <section id="product" className="craft-route craft-paper">
        <div className="craft-container craft-route-grid">
          <h2 className="craft-heading craft-route-title">{c.pathTitle}</h2>
          <ol className="craft-path" aria-label={c.pathTitle}>
            {c.path.map((item, index) => (
              <li key={item}>
                <span>{item}</span>
                {index < c.path.length - 1 && <span aria-hidden>→</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="craft-evidence craft-paper-sage" aria-labelledby="evidence-title">
        <div className="craft-container craft-evidence-grid">
          <div>
            <p className="craft-kicker">{c.evidenceKicker}</p>
            <h2 id="evidence-title" className="craft-display craft-display-medium">
              {c.evidenceTitleA}
              <br />
              {c.evidenceTitleB}
            </h2>
            <p className="craft-lede craft-lede-dark">{c.evidenceBody}</p>
          </div>
          <article className="craft-evidence-sheet">
            <div className="craft-profile-line">
              <span className="craft-avatar craft-avatar-sage" aria-hidden>
                DR
              </span>
              <div>
                <small>{c.example}</small>
                <h3>Diyora R.</h3>
                <p>{c.role}</p>
              </div>
              <span className="craft-score craft-score-sage">94</span>
            </div>
            <dl className="craft-signal-list">
              <div>
                <dt>{c.roleFit}</dt>
                <dd>{t("landing.ai.str.1")}</dd>
              </div>
              <div>
                <dt>{c.experience}</dt>
                <dd>{t("landing.ai.str.2")}</dd>
              </div>
              <div>
                <dt>{c.languages}</dt>
                <dd>RU · UZ · EN</dd>
              </div>
            </dl>
            <button
              className="craft-button craft-button-ink"
              type="button"
              disabled
              aria-disabled="true"
            >
              {c.shortlist}
            </button>
          </article>
        </div>
      </section>

      <section id="how" className="craft-workflow craft-paper" aria-labelledby="workflow-title">
        <div className="craft-container">
          <div className="craft-workflow-intro">
            <p className="craft-kicker">{c.workflowKicker}</p>
            <h2 id="workflow-title" className="craft-heading craft-heading-large">
              {c.workflowTitle}
            </h2>
            <p>{c.workflowBody}</p>
          </div>
          <ol className="craft-steps">
            {STEPS.map(({ number, titleKey, icon: StepIcon }, index) => (
              <li key={number}>
                <span className="craft-step-number">{number}</span>
                <StepIcon aria-hidden size={22} />
                <h3>{t(titleKey)}</h3>
                <p>{t(`landing.how.step${index + 1}_desc` as "landing.how.step1_desc")}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="craft-human craft-paper-blue">
        <div className="craft-container craft-human-grid">
          <div className="craft-human-portrait" aria-hidden="true">
            <span className="craft-human-face">HR</span>
            <span className="craft-human-caption">review · compare · decide</span>
          </div>
          <div>
            <h2 className="craft-display craft-display-medium">
              {c.humanTitleA}
              <br />
              {c.humanTitleB}
            </h2>
            <p className="craft-lede craft-lede-dark">{c.humanBody}</p>
            <Link className="craft-text-link" href="/security">
              <ShieldCheck aria-hidden size={18} /> {t("landing.footer.n_security")}{" "}
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="craft-language craft-paper-sun">
        <div className="craft-container craft-language-grid">
          <div>
            <h2 className="craft-display craft-display-small">{c.localTitle}</h2>
            <p>{c.localBody}</p>
          </div>
          <div className="craft-language-list" aria-label="Supported CV languages">
            <span>RU</span>
            <span>UZ</span>
            <span>EN</span>
          </div>
        </div>
      </section>

      <section
        id="sourcing"
        className="craft-sourcing craft-paper"
        aria-labelledby="sourcing-title"
      >
        <div className="craft-container">
          <p className="craft-kicker">{c.sourcingKicker}</p>
          <div className="craft-sourcing-head">
            <h2 id="sourcing-title" className="craft-display craft-display-medium">
              {c.sourcingTitleA}
              <br />
              {c.sourcingTitleB}
            </h2>
            <p className="craft-lede">{c.sourcingBody}</p>
          </div>
          <div className="craft-source-map">
            {c.sources.map((source, index) => (
              <article key={source.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index === 0 ? (
                  <Search aria-hidden />
                ) : index === 1 ? (
                  <strong>hh</strong>
                ) : (
                  <strong>TG</strong>
                )}
                <h3>{source.title}</h3>
                <p>{source.body}</p>
              </article>
            ))}
          </div>
          <div className="craft-actions">
            <Link
              className="craft-button craft-button-coral"
              href={`${SIGNUP_HREF}?utm_source=landing&utm_section=sourcing`}
            >
              {c.sourceCta} <ArrowRight aria-hidden size={17} />
            </Link>
            <Link className="craft-text-link" href="/product/sourcing">
              {c.sourceMore} <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="craft-final craft-paper-ink">
        <div className="craft-container craft-final-grid">
          <div>
            <h2 className="craft-display craft-display-medium">
              {c.finalA}
              <br />
              {c.finalB}
            </h2>
            <p>{c.finalBody}</p>
          </div>
          <div className="craft-actions craft-actions-end">
            <Link
              className="craft-button craft-button-coral"
              href={`${SIGNUP_HREF}?utm_source=landing&utm_section=final`}
            >
              {c.start} <ArrowRight aria-hidden size={17} />
            </Link>
            <Link className="craft-text-link craft-text-link-light" href="/pricing">
              {c.pricing} ↗
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
