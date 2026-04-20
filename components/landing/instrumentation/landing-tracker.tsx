"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/types";

type EventName =
  | "page_view"
  | "cta_click"
  | "demo_open"
  | "demo_complete"
  | "pricing_compare_open"
  | "faq_expand"
  | "contact_submit";

interface QueuedEvent {
  session_id: string;
  locale: Locale;
  event: EventName;
  target: string | null;
  utm_source: string | null;
  utm_section: string | null;
  path: string | null;
}

function makeSessionId(): string {
  const existing = window.sessionStorage.getItem("tezhr_sid");
  if (existing) return existing;
  const fresh =
    (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
  window.sessionStorage.setItem("tezhr_sid", fresh);
  return fresh;
}

function readUtm(): { utm_source: string | null; utm_section: string | null } {
  try {
    const qs = new URLSearchParams(window.location.search);
    return {
      utm_source: qs.get("utm_source"),
      utm_section: qs.get("utm_section"),
    };
  } catch {
    return { utm_source: null, utm_section: null };
  }
}

export function LandingTracker({ locale }: { locale: Locale }) {
  useEffect(() => {
    const sid = makeSessionId();
    const { utm_source, utm_section } = readUtm();
    const queue: QueuedEvent[] = [];

    const enqueue = (event: EventName, target: string | null) => {
      queue.push({
        session_id: sid,
        locale,
        event,
        target,
        utm_source,
        utm_section,
        path: window.location.pathname,
      });
      if (queue.length >= 5) flush();
    };

    const flush = () => {
      if (!queue.length) return;
      const payload = JSON.stringify({ events: queue.splice(0) });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/landing/events", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/landing/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch {
        // swallow — instrumentation must never throw
      }
    };

    enqueue("page_view", null);

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("[data-track]");
      if (!el) return;
      const raw = (el as HTMLElement).dataset.track ?? "";
      const [name, label] = raw.split(":");
      if (!name) return;
      if (
        name === "cta_click" ||
        name === "demo_open" ||
        name === "demo_complete" ||
        name === "pricing_compare_open" ||
        name === "faq_expand" ||
        name === "contact_submit"
      ) {
        enqueue(name, label ?? null);
      }
    };

    const onHide = () => flush();

    document.addEventListener("click", onClick, { passive: true });
    window.addEventListener("pagehide", onHide);

    const id = window.setInterval(flush, 15_000);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pagehide", onHide);
      window.clearInterval(id);
      flush();
    };
  }, [locale]);

  return null;
}
