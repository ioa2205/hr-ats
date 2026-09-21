"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { submitContactMessage, type ContactState } from "@/lib/actions/contact";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/provider";
import { TELEGRAM_URL } from "./constants";
import { TelegramIcon } from "./icons";

type ContactCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  form: string;
  name: string;
  namePh: string;
  email: string;
  emailPh: string;
  company: string;
  optional: string;
  companyPh: string;
  message: string;
  messagePh: string;
  hint: string;
  submit: string;
  sending: string;
  success: string;
  successBody: string;
  another: string;
  invalid: string;
  rate: string;
  generic: string;
  fast: string;
  telegram: string;
  telegramBody: string;
  open: string;
  note: string;
};

const COPY: Record<Locale, ContactCopy> = {
  en: {
    kicker: "Contact",
    title: "Say hello. We read every message.",
    subtitle:
      "Questions about the product, a Pro request, or a problem with your workspace — send the useful context and the team will reply through the email you provide.",
    form: "Leave a message",
    name: "Your name",
    namePh: "Diyora Rakhimova",
    email: "Email for reply",
    emailPh: "diyora@company.uz",
    company: "Company",
    optional: "optional",
    companyPh: "Company LLC",
    message: "Message",
    messagePh: "Tell us what you are trying to do and where you are blocked.",
    hint: "10–2,000 characters. Specific context helps us give a useful answer.",
    submit: "Send message",
    sending: "Sending…",
    success: "Message sent.",
    successBody: "We received it and will reply to the email you provided.",
    another: "Send another",
    invalid:
      "Check the fields: name, a valid email, and a 10–2,000 character message are required.",
    rate: "Too many messages from this connection. Please try later or use Telegram.",
    generic: "The message could not be sent. Try again or use Telegram.",
    fast: "Direct channel",
    telegram: "Message us on Telegram",
    telegramBody:
      "Use Telegram for account or product questions when that is more convenient than email.",
    open: "Open Telegram",
    note: "Specific questions get better answers.",
  },
  ru: {
    kicker: "Контакты",
    title: "Напишите нам. Каждое сообщение прочитают.",
    subtitle:
      "Вопрос о продукте, запрос Pro или проблема в рабочем пространстве — добавьте полезный контекст, и команда ответит на указанный email.",
    form: "Оставить сообщение",
    name: "Ваше имя",
    namePh: "Диёрa Рахимова",
    email: "Email для ответа",
    emailPh: "diyora@company.uz",
    company: "Компания",
    optional: "необязательно",
    companyPh: "Компания ООО",
    message: "Сообщение",
    messagePh: "Расскажите, что вы хотите сделать и где возникла проблема.",
    hint: "От 10 до 2 000 знаков. Конкретный контекст помогает дать полезный ответ.",
    submit: "Отправить",
    sending: "Отправляем…",
    success: "Сообщение отправлено.",
    successBody: "Мы его получили и ответим на указанный email.",
    another: "Отправить ещё одно",
    invalid: "Проверьте поля: нужны имя, корректный email и сообщение длиной 10–2 000 знаков.",
    rate: "Слишком много сообщений с этого подключения. Попробуйте позже или напишите в Telegram.",
    generic: "Не удалось отправить сообщение. Попробуйте ещё раз или используйте Telegram.",
    fast: "Прямой канал",
    telegram: "Напишите нам в Telegram",
    telegramBody:
      "Используйте Telegram для вопросов об аккаунте или продукте, если так удобнее, чем по email.",
    open: "Открыть Telegram",
    note: "Конкретные вопросы получают более полезные ответы.",
  },
  uz: {
    kicker: "Aloqa",
    title: "Bizga yozing. Har bir xabar o‘qiladi.",
    subtitle:
      "Mahsulot savoli, Pro so‘rovi yoki ish maydonidagi muammo — kerakli kontekstni yuboring, jamoa ko‘rsatgan emailingiz orqali javob beradi.",
    form: "Xabar qoldiring",
    name: "Ismingiz",
    namePh: "Diyora Rahimova",
    email: "Javob uchun email",
    emailPh: "diyora@company.uz",
    company: "Kompaniya",
    optional: "ixtiyoriy",
    companyPh: "Kompaniya MChJ",
    message: "Xabar",
    messagePh: "Nima qilmoqchi ekaningizni va qayerda to‘xtab qolganingizni yozing.",
    hint: "10–2 000 belgi. Aniq kontekst foydali javob berishga yordam beradi.",
    submit: "Xabar yuborish",
    sending: "Yuborilmoqda…",
    success: "Xabar yuborildi.",
    successBody: "Xabaringizni oldik va ko‘rsatgan emailingizga javob beramiz.",
    another: "Yana xabar yuborish",
    invalid: "Maydonlarni tekshiring: ism, to‘g‘ri email va 10–2 000 belgili xabar kerak.",
    rate: "Bu ulanishdan juda ko‘p xabar yuborildi. Keyinroq urinib ko‘ring yoki Telegramdan foydalaning.",
    generic: "Xabar yuborilmadi. Qayta urinib ko‘ring yoki Telegramdan foydalaning.",
    fast: "To‘g‘ridan-to‘g‘ri kanal",
    telegram: "Telegram orqali yozing",
    telegramBody:
      "Akkaunt yoki mahsulot savollari uchun emaildan ko‘ra qulay bo‘lsa, Telegramdan foydalaning.",
    open: "Telegramni ochish",
    note: "Aniq savollar foydaliroq javob beradi.",
  },
};

function SubmitButton({ copy }: { copy: ContactCopy }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="craft-button craft-button-sage" disabled={pending}>
      {pending ? copy.sending : copy.submit}
      <Send aria-hidden size={16} />
    </button>
  );
}

function ContactForm({ copy, onReset }: { copy: ContactCopy; onReset: () => void }) {
  const [state, action] = useActionState<ContactState, FormData>(submitContactMessage, null);
  if (state?.ok) {
    return (
      <div className="craft-contact-success" role="status">
        <p className="craft-kicker">✓ {copy.success}</p>
        <h2>{copy.success}</h2>
        <p>{copy.successBody}</p>
        <button type="button" className="craft-text-link" onClick={onReset}>
          {copy.another}
        </button>
      </div>
    );
  }
  const error =
    state?.error === "invalid_input"
      ? copy.invalid
      : state?.error === "too_many"
        ? copy.rate
        : state?.error
          ? copy.generic
          : null;
  return (
    <form action={action} className="craft-contact-form">
      <h2>{copy.form}</h2>
      <label>
        <span>{copy.name}</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder={copy.namePh}
          autoComplete="name"
        />
      </label>
      <label>
        <span>{copy.email}</span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder={copy.emailPh}
          autoComplete="email"
        />
      </label>
      <label>
        <span>
          {copy.company} <small>· {copy.optional}</small>
        </span>
        <input
          name="company"
          maxLength={120}
          placeholder={copy.companyPh}
          autoComplete="organization"
        />
      </label>
      <label>
        <span>{copy.message}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder={copy.messagePh}
        />
        <small>{copy.hint}</small>
      </label>
      {error && (
        <p className="craft-form-error" role="alert">
          {error}
        </p>
      )}
      <SubmitButton copy={copy} />
    </form>
  );
}

export function ContactContent() {
  const { locale } = useTranslation();
  const c = COPY[locale];
  const [key, setKey] = useState(0);
  return (
    <main id="main">
      <section className="craft-contact-hero craft-page-hero craft-paper">
        <div className="craft-container">
          <p className="craft-kicker">{c.kicker}</p>
          <h1 className="craft-display">{c.title}</h1>
          <p className="craft-lede">{c.subtitle}</p>
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
      <section className="craft-contact-band craft-paper-blue">
        <div className="craft-container craft-contact-grid">
          <ContactForm key={key} copy={c} onReset={() => setKey((value) => value + 1)} />
          <aside aria-label={c.fast}>
            <p className="craft-kicker">{c.fast}</p>
            <h2>{c.telegram}</h2>
            <p>{c.telegramBody}</p>
            <a
              className="craft-button craft-button-coral"
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TelegramIcon size={17} />
              {c.open}
            </a>
          </aside>
        </div>
      </section>
      <section className="craft-contact-note craft-paper-sun">
        <div className="craft-container">
          <p>{c.note}</p>
        </div>
      </section>
    </main>
  );
}
