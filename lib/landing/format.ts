import type { Locale } from "@/lib/i18n/types";

export function formatBcp(locale: Locale): string {
  return locale === "uz" ? "uz-Latn" : locale === "en" ? "en-US" : "ru-RU";
}

export function formatInt(n: number, locale: Locale): string {
  return n.toLocaleString(formatBcp(locale));
}

export function formatUZS(amount: number, locale: Locale): string {
  const grouped = new Intl.NumberFormat(formatBcp(locale), {
    maximumFractionDigits: 0,
  }).format(amount);
  if (locale === "en") return `UZS ${grouped}`;
  if (locale === "uz") return `${grouped} so'm`;
  return `${grouped} сум`;
}

export function formatLandingDate(d: Date, locale: Locale): string {
  if (locale === "en") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatEditionLabel(d: Date, locale: Locale): string {
  const weekNo = Math.ceil(
    ((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000 + 1) / 7,
  );
  const edition = String(weekNo).padStart(2, "0");
  if (locale === "en") return `No. ${edition} · ${d.getFullYear()}`;
  if (locale === "uz") return `№ ${edition} · ${d.getFullYear()}`;
  return `№ ${edition} · ${d.getFullYear()}`;
}
