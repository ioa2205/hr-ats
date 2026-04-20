import { startOfWeek, format, formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TZ = "Asia/Tashkent";

export function nowTashkent(): Date {
  return toZonedTime(new Date(), TZ);
}

export function todayStartTashkent(): string {
  const now = nowTashkent();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export function tomorrowStartTashkent(): string {
  const now = nowTashkent();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() + 1);
  return now.toISOString();
}

export function weekStartTashkent(): string {
  const now = nowTashkent();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export function formatTashkentDate(dateStr: string): string {
  const date = toZonedTime(new Date(dateStr), TZ);
  return format(date, "dd.MM.yyyy");
}

export function relativeDate(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function absoluteDate(dateStr: string): string {
  const date = toZonedTime(new Date(dateStr), TZ);
  return format(date, "dd.MM.yyyy HH:mm");
}
