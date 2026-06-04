"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { logger } from "@/lib/logger";
import { HH_UZ_AREAS, HH_UZBEKISTAN_AREA_ID } from "@/lib/sourcing/connectors/hh/areas";
import type { SourceKind } from "@/lib/sourcing/types";

/** Sources a user can toggle (linkedin_url is a schema placeholder, never shown). */
const SELECTABLE: SourceKind[] = ["internal_pool", "hh", "telegram"];

const SOURCE_LABEL_KEY: Record<SourceKind, TranslationKey> = {
  internal_pool: "sourcing.results.source.internal_pool",
  hh: "sourcing.results.source.hh",
  telegram: "sourcing.results.source.telegram",
  linkedin_url: "sourcing.results.source.linkedin_url",
};

/** Sentinel select value for "no area filter". */
const ALL_REGIONS = "__all__";

export interface SourcingConfigDialogProps {
  jobId: string;
  /** sources actually configured for this company (the selectable ceiling). */
  availableSources?: SourceKind[];
  /** pre-checked sources (defaults to all available). */
  defaultSources?: SourceKind[];
  /** pre-filled hh keywords (the prior run's effective query, when re-running). */
  defaultKeywords?: string[];
  /** pre-selected hh area; `undefined` ⇒ Uzbekistan, `null` ⇒ all regions. */
  defaultAreaId?: string | null;
  // Trigger button styling (mirrors the old FindCandidatesButton API).
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tonal";
  label?: string;
}

export function SourcingConfigDialog({
  jobId,
  availableSources = ["internal_pool"],
  defaultSources,
  defaultKeywords,
  defaultAreaId,
  disabled = false,
  variant = "secondary",
  label,
}: SourcingConfigDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const hhAvailable = availableSources.includes("hh");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<SourceKind>>(
    () => new Set(defaultSources ?? availableSources),
  );
  const [keywords, setKeywords] = useState(() => (defaultKeywords ?? []).join(", "));
  const [areaValue, setAreaValue] = useState<string>(() => {
    if (defaultAreaId === undefined) return HH_UZBEKISTAN_AREA_ID;
    return defaultAreaId === null ? ALL_REGIONS : defaultAreaId;
  });

  // A re-run can carry a custom area id outside the curated catalog — keep it.
  const areaOptions = useMemo(() => {
    const known = HH_UZ_AREAS.some((a) => a.id === areaValue);
    if (areaValue && areaValue !== ALL_REGIONS && !known) {
      return [{ id: areaValue, name: areaValue }, ...HH_UZ_AREAS];
    }
    return HH_UZ_AREAS;
  }, [areaValue]);

  const hhChecked = selected.has("hh");

  function toggle(kind: SourceKind) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const body: { sources: SourceKind[]; keywords?: string[]; areaId?: string | null } = {
        sources: [...selected],
      };
      if (hhAvailable) {
        const kw = keywords
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (kw.length > 0) body.keywords = kw;
        body.areaId = areaValue === ALL_REGIONS ? null : areaValue;
      }

      const res = await fetch(`/api/hr/jobs/${jobId}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 202) {
        const { searchId } = (await res.json()) as { searchId: string };
        router.push(`/hr/jobs/${jobId}/sourcing/${searchId}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        toast({ variant: "info", title: t("sourcing.find.inflight") });
        setOpen(false);
        router.refresh();
        return;
      }
      if (data.error === "sourcing_quota_exceeded") {
        toast({ variant: "error", title: t("sourcing.find.quota_exceeded") });
        return;
      }
      if (data.error === "subscription_inactive") {
        toast({ variant: "error", title: t("sourcing.find.inactive") });
        return;
      }
      throw new Error(data.error ?? "unknown");
    } catch (err) {
      logger.error({ err: String(err), jobId }, "[sourcing] config submit failed");
      toast({ variant: "error", title: t("sourcing.find.error") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? t("sourcing.find.hint") : undefined}
      >
        <Search className="h-4 w-4" />
        {label ?? t("sourcing.find.button")}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setOpen(false);
          }}
        >
          <div className="border-rule bg-paper shadow-tez-3 max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-[6px] border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-ink text-[16px] font-semibold">
                  {t("sourcing.config.title")}
                </div>
                <p className="text-ink-4 mt-1 text-[12.5px] leading-[1.5]">
                  {t("sourcing.config.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-ink-5 hover:bg-bone-2 -mr-1 -mt-1 rounded-[4px] p-1"
                aria-label={t("common.cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sources */}
            <div className="mt-4">
              <div className="text-ink-2 text-[11.5px] font-semibold">
                {t("sourcing.config.sources_label")}
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {SELECTABLE.map((kind) => {
                  const isAvailable =
                    kind === "internal_pool" || availableSources.includes(kind);
                  const checked = selected.has(kind) && isAvailable;
                  return (
                    <label
                      key={kind}
                      className={`border-rule flex items-center gap-2.5 rounded-[4px] border px-3 py-2 text-[12.5px] ${
                        isAvailable ? "bg-paper cursor-pointer" : "bg-bone-2 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isAvailable}
                        onChange={() => toggle(kind)}
                        className="accent-ink h-3.5 w-3.5"
                      />
                      <span className={isAvailable ? "text-ink-2" : "text-ink-5"}>
                        {t(SOURCE_LABEL_KEY[kind])}
                      </span>
                      {!isAvailable && kind === "hh" && (
                        <Link
                          href="/hr/settings/company"
                          className="text-persimmon-2 ml-auto text-[11px] font-medium hover:underline"
                        >
                          {t("sourcing.config.hh_connect")}
                        </Link>
                      )}
                      {!isAvailable && kind === "telegram" && (
                        <span className="text-ink-5 ml-auto text-[11px]">
                          {t("sourcing.config.unavailable")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {!hhAvailable && (
                <p className="text-ink-5 mt-2 text-[11px] leading-[1.5]">
                  {t("sourcing.config.hh_unavailable")}
                </p>
              )}
            </div>

            {/* hh.uz query options */}
            {hhAvailable && (
              <div className={`mt-4 ${hhChecked ? "" : "pointer-events-none opacity-50"}`}>
                <div className="text-ink-2 text-[11.5px] font-semibold">
                  {t("sourcing.config.hh_options_label")}
                </div>

                <div className="mt-2">
                  <label className="text-ink-3 text-[11px]">
                    {t("sourcing.config.keywords_label")}
                  </label>
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={!hhChecked}
                    rows={2}
                    placeholder={t("sourcing.config.keywords_placeholder")}
                    className="border-rule-2 bg-paper text-ink mt-1 w-full resize-none rounded-[4px] border px-2.5 py-2 text-[12.5px]"
                  />
                  <p className="text-ink-5 mt-1 text-[11px] leading-[1.45]">
                    {t("sourcing.config.keywords_hint")}
                  </p>
                </div>

                <div className="mt-3">
                  <label className="text-ink-3 text-[11px]">
                    {t("sourcing.config.region_label")}
                  </label>
                  <select
                    value={areaValue}
                    onChange={(e) => setAreaValue(e.target.value)}
                    disabled={!hhChecked}
                    className="border-rule-2 bg-paper text-ink mt-1 w-full rounded-[4px] border px-2.5 py-2 text-[12.5px]"
                  >
                    <option value={ALL_REGIONS}>{t("sourcing.config.region_all")}</option>
                    {areaOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selected.size === 0 && (
              <p className="text-persimmon-2 mt-3 text-[11.5px]">
                {t("sourcing.config.no_sources")}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <TezButton
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </TezButton>
              <TezButton
                size="sm"
                variant="primary"
                onClick={submit}
                disabled={loading || selected.size === 0}
              >
                {loading ? t("sourcing.find.searching") : t("sourcing.config.submit")}
              </TezButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
