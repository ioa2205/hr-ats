"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "@/components/auth/auth-field";
import { AuthBanner } from "@/components/auth/auth-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CreateCompanyLabels {
  company_name: string;
  company_name_hint: string;
  default_locale: string;
  default_locale_hint: string;
  creating: string;
  create: string;
  back: string;
  error_slug_taken: string;
  error_create_failed: string;
  locale_ru: string;
  locale_uz: string;
  locale_en: string;
}

interface CreateCompanyFormProps {
  labels: CreateCompanyLabels;
  intent?: "pro";
}

export function CreateCompanyForm({ labels, intent }: CreateCompanyFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [defaultLocale, setDefaultLocale] = useState("ru");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, default_locale: defaultLocale }),
      });

      const body = await res.json();

      if (!res.ok) {
        const errorKey = body.error as string;
        const knownErrors: Record<string, string> = { slug_taken: labels.error_slug_taken };
        setError(knownErrors[errorKey] ?? labels.error_create_failed);
        return;
      }

      router.push(intent === "pro" ? "/hr/settings/billing?intent=pro" : "/hr/dashboard");
      router.refresh();
    } catch {
      setError(labels.error_create_failed);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <AuthBanner tone="error">{error}</AuthBanner>}

      <AuthField
        label={labels.company_name}
        placeholder={labels.company_name_hint}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        required
        minLength={2}
        maxLength={100}
        name="company_name"
        autoComplete="organization"
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="onboarding-default-locale"
          className="text-[13px] font-semibold tracking-[-0.005em] text-[var(--color-text)]"
        >
          {labels.default_locale}
        </label>
        <Select value={defaultLocale} onValueChange={setDefaultLocale}>
          <SelectTrigger
            id="onboarding-default-locale"
            aria-describedby="onboarding-default-locale-hint"
            className="h-[52px] rounded-[12px] px-4 text-[16px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="account-select">
            <SelectItem value="ru">{labels.locale_ru}</SelectItem>
            <SelectItem value="uz">{labels.locale_uz}</SelectItem>
            <SelectItem value="en">{labels.locale_en}</SelectItem>
          </SelectContent>
        </Select>
        <p
          id="onboarding-default-locale-hint"
          className="text-[12.5px] text-[var(--color-text-muted)]"
        >
          {labels.default_locale_hint}
        </p>
      </div>

      <div className="mt-1 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.push(intent === "pro" ? "/onboarding?intent=pro" : "/onboarding")}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {labels.back}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={creating || name.trim().length < 2}
          className="flex-1"
        >
          {creating && (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {creating ? labels.creating : labels.create}
        </Button>
      </div>
    </form>
  );
}
