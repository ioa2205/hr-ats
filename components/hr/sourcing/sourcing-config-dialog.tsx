"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  InlineMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from "@/components/ui";
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never let an in-flight submit be interrupted by an accidental dismiss.
        if (loading) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} disabled={disabled} title={disabled ? t("sourcing.find.hint") : undefined}>
          <Search className="h-4 w-4" />
          {label ?? t("sourcing.find.button")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("sourcing.config.title")}</DialogTitle>
          <DialogDescription>{t("sourcing.config.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto px-6 py-2">
          {/* Sources */}
          <Field label={t("sourcing.config.sources_label")}>
            <div className="flex flex-col gap-1.5">
              {SELECTABLE.map((kind) => {
                const isAvailable = kind === "internal_pool" || availableSources.includes(kind);
                const checked = selected.has(kind) && isAvailable;
                return (
                  <div
                    key={kind}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] px-3 py-2"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!isAvailable}
                      onChange={() => toggle(kind)}
                      label={t(SOURCE_LABEL_KEY[kind])}
                    />
                    {!isAvailable && kind === "hh" && (
                      <Link
                        href="/hr/settings/company"
                        className="shrink-0 text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {t("sourcing.config.hh_connect")}
                      </Link>
                    )}
                    {!isAvailable && kind === "telegram" && (
                      <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
                        {t("sourcing.config.unavailable")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {!hhAvailable && (
              <p className="mt-2 text-xs leading-[1.5] text-[var(--color-text-subtle)]">
                {t("sourcing.config.hh_unavailable")}
              </p>
            )}
          </Field>

          {/* hh.uz query options */}
          {hhAvailable && (
            <div className={hhChecked ? "flex flex-col gap-4" : "pointer-events-none flex flex-col gap-4 opacity-50"}>
              <p className="text-xs font-semibold tracking-[0.04em] text-[var(--color-text-muted)] uppercase data-mono">
                {t("sourcing.config.hh_options_label")}
              </p>

              <Field label={t("sourcing.config.keywords_label")} helperText={t("sourcing.config.keywords_hint")}>
                <Textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={!hhChecked}
                  rows={2}
                  placeholder={t("sourcing.config.keywords_placeholder")}
                  className="min-h-[60px]"
                />
              </Field>

              <Field label={t("sourcing.config.region_label")}>
                <Select value={areaValue} onValueChange={setAreaValue} disabled={!hhChecked}>
                  <SelectTrigger aria-label={t("sourcing.config.region_label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_REGIONS}>{t("sourcing.config.region_all")}</SelectItem>
                    {areaOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {selected.size === 0 && (
            <InlineMessage tone="danger">{t("sourcing.config.no_sources")}</InlineMessage>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={loading} disabled={selected.size === 0}>
            {t("sourcing.config.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
