import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { uz } from "@/lib/i18n/uz";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import {
  emailSubject,
  shareHref,
  shareMessage,
  type ShareContext,
} from "@/lib/share/messages";

const TABLES = { en, ru, uz } as const;

function makeT(locale: Locale) {
  return (key: TranslationKey): string => TABLES[locale][key];
}

const ctx: ShareContext = {
  title: "ML Engineer",
  company: "Tezsoft",
  url: "https://tezhr.uz/apply/abc123",
  locale: "en",
};

describe("shareMessage", () => {
  it("substitutes title, company, and url placeholders", () => {
    const msg = shareMessage("telegram", ctx, makeT("en"));
    expect(msg).toContain("ML Engineer");
    expect(msg).toContain("Tezsoft");
    expect(msg).toContain("https://tezhr.uz/apply/abc123");
  });

  it("returns Russian copy when locale is ru", () => {
    const msg = shareMessage("whatsapp", { ...ctx, locale: "ru" }, makeT("ru"));
    expect(msg).toContain("ML Engineer");
    expect(msg).toMatch(/[А-Яа-я]/);
  });

  it("returns Uzbek copy when locale is uz", () => {
    const msg = shareMessage("linkedin", { ...ctx, locale: "uz" }, makeT("uz"));
    expect(msg).toContain("Tezsoft");
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe("shareHref", () => {
  const t = makeT("en");

  it("encodes the URL into the Telegram share intent", () => {
    const href = shareHref("telegram", ctx, t);
    expect(href.startsWith("https://t.me/share/url?")).toBe(true);
    expect(href).toContain(encodeURIComponent(ctx.url));
  });

  it("builds wa.me link with text payload", () => {
    const href = shareHref("whatsapp", ctx, t);
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
  });

  it("builds linkedin share-offsite link with url query", () => {
    const href = shareHref("linkedin", ctx, t);
    expect(
      href.startsWith("https://www.linkedin.com/sharing/share-offsite/?url="),
    ).toBe(true);
  });

  it("produces a mailto link with subject and body for email", () => {
    const href = shareHref("email", ctx, t);
    expect(href.startsWith("mailto:?subject=")).toBe(true);
    expect(href).toContain("&body=");
  });
});

describe("emailSubject", () => {
  it("formats subject with title and company", () => {
    expect(emailSubject(ctx, makeT("en"))).toBe("ML Engineer — Tezsoft");
  });
});
