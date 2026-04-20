"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { relativeDate } from "@/lib/time";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";

interface ScreenedOutAccordionProps {
  screenedOut: Pick<Candidate, "id" | "full_name" | "created_at" | "status">[];
}

export function ScreenedOutAccordion({ screenedOut }: ScreenedOutAccordionProps) {
  const { t } = useTranslation();
  return (
    <Accordion.Root type="single" collapsible className="border-outline-variant border-t">
      <Accordion.Item value="screened-out">
        <Accordion.Header>
          <Accordion.Trigger className="group text-on-surface-variant hover:bg-surface-container flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium">
            {t("applicants.screened_out_accordion", { count: String(screenedOut.length) })}
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <div className="space-y-0">
            {screenedOut.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-on-surface">{c.full_name}</span>
                <span className="text-on-surface-variant text-xs">
                  {relativeDate(c.created_at)}
                </span>
              </div>
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
