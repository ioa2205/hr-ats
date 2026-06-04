"use client";

import {
  SourcingConfigDialog,
  type SourcingConfigDialogProps,
} from "@/components/hr/sourcing/sourcing-config-dialog";

/**
 * "Find candidates" / "Re-run search" entry point. Opens the sourcing config
 * dialog (sources + hh.uz keywords + region) instead of firing a zero-config
 * POST, so every run is transparent and adjustable. The dialog owns submit +
 * navigation; this is a thin, stable wrapper kept for the existing call sites.
 */
export type FindCandidatesButtonProps = SourcingConfigDialogProps;

export function FindCandidatesButton(props: FindCandidatesButtonProps) {
  return <SourcingConfigDialog {...props} />;
}
