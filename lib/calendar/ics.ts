/**
 * Minimal RFC 5545 VCALENDAR/VEVENT generator.
 *
 * Produces a single-event calendar file suitable for "Add to calendar"
 * downloads. Times are emitted in UTC as `YYYYMMDDTHHMMSSZ`. CRLF line
 * endings are mandatory per RFC; we also fold lines longer than 75
 * octets at 73 with a leading single space.
 *
 * No native deps — pure string assembly so it can run anywhere
 * (Route Handlers, Edge Functions).
 */

export interface IcsEvent {
  uid: string;
  /** Wall-clock event start, will be normalized to UTC. */
  startAt: Date;
  /** Wall-clock event end, will be normalized to UTC. */
  endAt: Date;
  summary: string;
  description?: string;
  location?: string;
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  url?: string;
  /** Defaults to startAt when omitted (used for DTSTAMP). */
  generatedAt?: Date;
}

const PRODID = "-//TezHR//Interview Scheduling//EN";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Escape special characters per RFC 5545 §3.3.11 for TEXT property values.
 * Backslash, comma, semicolon get prefixed with `\`; newlines become `\n`.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold lines longer than 75 octets per RFC 5545 §3.1.
 * We use 73 chars + a leading space on continuation lines for safety.
 */
export function foldIcsLine(line: string): string {
  const max = 73;
  if (line.length <= max) return line;
  const out: string[] = [];
  let i = 0;
  out.push(line.slice(0, max));
  i += max;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + max));
    i += max;
  }
  return out.join("\r\n");
}

export function buildIcs(event: IcsEvent): string {
  const dtstamp = toIcsUtc(event.generatedAt ?? new Date());
  const dtstart = toIcsUtc(event.startAt);
  const dtend = toIcsUtc(event.endAt);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (event.description && event.description.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location && event.location.trim()) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url && event.url.trim()) {
    lines.push(`URL:${escapeIcsText(event.url)}`);
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeIcsText(event.organizerName)}` : "";
    lines.push(`ORGANIZER${cn}:mailto:${event.organizerEmail}`);
  }
  if (event.attendeeEmail) {
    const cn = event.attendeeName ? `;CN=${escapeIcsText(event.attendeeName)}` : "";
    lines.push(
      `ATTENDEE${cn};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${event.attendeeEmail}`,
    );
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
