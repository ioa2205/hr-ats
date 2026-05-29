"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server while a search is still queued/running so the results page
 * updates when the worker finishes. sourcing_searches isn't on the Realtime
 * publication, so a light refresh interval is the simplest live-update path.
 */
export function SourcingAutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}
