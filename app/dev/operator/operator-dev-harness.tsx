"use client";

import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui";
import { DashboardView, type DashboardData } from "@/components/operator/dashboard/dashboard-view";
import { InboxView } from "@/app/(operator)/operator/inbox/inbox-view";
import { PendingPromotions } from "@/components/operator/inbox/pending-promotions";
import { PendingSubscriptionUpgrades } from "@/components/operator/inbox/pending-subscription-upgrades";
import { ImpersonationBannerView } from "@/components/operator/impersonation-banner-view";
import OperatorCompaniesPage from "@/app/(operator)/operator/companies/page";
import IncidentsPage from "@/app/(operator)/operator/incidents/page";
import SettingsPage from "@/app/(operator)/operator/settings/page";
import CompanyDetailPage from "@/app/(operator)/operator/companies/[id]/page";

/**
 * Gated visual-QA harness for the Phase 9 operator console surfaces. Installs a
 * `window.fetch` mock so the real (self-fetching) operator pages render with
 * representative data inside the operator token context — letting Playwright
 * (tests/e2e/operator-console.spec.ts) drive RU/UZ/EN × light/dark × widths and
 * run Axe without seeding Supabase.
 */

const T0 = "2026-06-10T09:00:00.000Z";

const DASHBOARD: DashboardData = {
  generatedAt: T0,
  range: 30,
  health: {
    platform: { state: "amber", aiFailureRate24h: 0.034 },
    aiCostBurn: { state: "ok", today: 4.21, avgDaily30d: 3.88 },
    trialToPaid7d: { pct: 22, trials: 18, conversions: 4 },
    mrrEstimate: { usd: 5400, activeSubs: 27, delta30dUsd: 600 },
  },
  timeseries: Array.from({ length: 12 }, (_, i) => ({
    day: `2026-05-${String(20 + i).padStart(2, "0")}`,
    activeCompanies: 20 + i,
    candidatesProcessed: 30 + ((i * 7) % 40),
    dailyActiveUsers: 12 + ((i * 3) % 20),
    aiCostUsd: 3 + (i % 5) * 0.5,
  })),
  topMovers: {
    growing: [
      { companyId: "c1", name: "Tashkent Digital Solutions", delta: 12, candidates: 48 },
      { companyId: "c2", name: "Samarqand Logistics", delta: 7, candidates: 21 },
    ],
    atRisk: [
      { companyId: "c3", name: "Bukhara Retail Group", score: 28, reason: "no_logins,trial_ending" },
      { companyId: "c4", name: "Andijan Textiles", score: 35, reason: "ai_failures" },
    ],
  },
  recentActivity: [
    { id: 1, action: "company.suspended", actor: "operator@tezhr.uz", entityType: "company", entityId: "c3", createdAt: T0 },
    { id: 2, action: "impersonation.started", actor: "operator@tezhr.uz", entityType: "user", entityId: "u9", createdAt: T0 },
  ],
  workers: [
    { worker: "process-cv", state: "ok", lastRunAt: T0, lastError: null, consecutiveFailures: 0 },
    { worker: "sourcing-run", state: "red", lastRunAt: T0, lastError: "ECONNRESET hh.uz", consecutiveFailures: 4 },
    { worker: "notification-retry", state: "amber", lastRunAt: T0, lastError: null, consecutiveFailures: 1 },
    { worker: "telegram-ingest", state: "ok", lastRunAt: T0, lastError: null, consecutiveFailures: 0 },
  ],
};

const INBOX_MESSAGES = [
  {
    id: "m1",
    name: "Дилnoza Karimova",
    email: "dilnoza@example.uz",
    company: "Tashkent Digital Solutions",
    message: "Здравствуйте! Хотим узнать про корпоративный тариф и интеграции.",
    locale: "ru",
    source: "contact_form",
    read_at: null,
    created_at: T0,
  },
  {
    id: "m2",
    name: "Bobur Aliyev",
    email: "bobur@example.uz",
    company: null,
    message: "Salom! Telegram orqali nomzodlarni qidirish qanday ishlaydi?",
    locale: "uz",
    source: "contact_form",
    read_at: T0,
    created_at: "2026-06-09T08:00:00.000Z",
  },
];

const COMPANIES = {
  data: [
    {
      id: "c1",
      name: "Tashkent Digital Solutions",
      slug: "tashkent-digital",
      status: "active",
      default_locale: "ru",
      created_at: "2026-01-12T00:00:00.000Z",
      health_score: 82,
      subscriptions: [{ status: "active", plan: "pro", trial_ends_at: null }],
      company_members: [{ count: 12 }],
    },
    {
      id: "c3",
      name: "Bukhara Retail Group",
      slug: "bukhara-retail",
      status: "suspended",
      default_locale: "uz",
      created_at: "2026-03-02T00:00:00.000Z",
      health_score: 28,
      subscriptions: [{ status: "expired", plan: "trial", trial_ends_at: "2026-04-01T00:00:00.000Z" }],
      company_members: [{ count: 3 }],
    },
    {
      id: "c5",
      name: "Navoi Mining Co",
      slug: "navoi-mining",
      status: "deleted",
      default_locale: "en",
      created_at: "2025-11-20T00:00:00.000Z",
      health_score: null,
      subscriptions: null,
      company_members: [{ count: 0 }],
    },
  ],
  total: 3,
};

const COMPANY_DETAIL = {
  company: {
    id: "c1",
    name: "Tashkent Digital Solutions",
    slug: "tashkent-digital",
    status: "active",
    default_locale: "ru",
    created_at: "2026-01-12T00:00:00.000Z",
  },
  members: [
    {
      user_id: "u1",
      role: "owner",
      created_at: "2026-01-12T00:00:00.000Z",
      profile: { id: "u1", email: "owner@tashkent.uz", full_name: "Aziz Yusupov", avatar_url: null },
    },
    {
      user_id: "u2",
      role: "recruiter",
      created_at: "2026-02-01T00:00:00.000Z",
      profile: { id: "u2", email: "hr@tashkent.uz", full_name: null, avatar_url: null },
    },
  ],
  subscription: {
    status: "active",
    plan: "pro",
    trial_ends_at: "2026-02-12T00:00:00.000Z",
    cv_quota_used: 120,
    cv_quota_limit: 500,
    job_quota_limit: 25,
    sourcing_quota_used: 14,
    sourcing_quota_limit: 100,
  },
  usage: { ai_cost_usd_30d: 42.18, candidate_count_30d: 318, active_job_count: 9 },
};

const INCIDENTS = {
  firing: 2,
  data: [
    {
      id: 1,
      rule_id: "ai_failure_rate",
      severity: "critical",
      target_type: "company",
      target_id: "c3",
      target_label: "Bukhara Retail Group",
      summary: "AI failure rate 18% over the last hour (threshold 10%).",
      status: "firing",
      first_fired_at: T0,
      last_fired_at: T0,
      ack_at: null,
      resolved_at: null,
      resolution_note: null,
    },
    {
      id: 2,
      rule_id: "worker_stalled",
      severity: "warn",
      target_type: null,
      target_id: null,
      target_label: null,
      summary: "sourcing-run worker has 4 consecutive failures.",
      status: "firing",
      first_fired_at: T0,
      last_fired_at: T0,
      ack_at: null,
      resolved_at: null,
      resolution_note: null,
    },
  ],
};

const TEAM = {
  data: [
    { id: "o1", email: "lead@tezhr.uz", full_name: "Operator Lead", operator_role: "full", updated_at: T0 },
    { id: "o2", email: "support@tezhr.uz", full_name: null, operator_role: "read_only", updated_at: T0 },
  ],
};

const SETTINGS = {
  settings: {
    maintenance_mode: "false",
    signup_paused: "false",
    gemini_model: "gemini-3-pro",
    trial_length_days: "14",
    default_cv_quota: "50",
    default_job_quota: "3",
    default_sourcing_quota: "50",
  },
};

const PROMOTIONS = {
  data: [
    {
      id: 7,
      targetUserId: "u9",
      targetLabel: "new-op@tezhr.uz",
      proposerUserId: "o1",
      proposerLabel: "Operator Lead",
      kind: "promote",
      reason: "Joining the on-call rotation for platform incidents next month.",
      createdAt: T0,
    },
  ],
};

const UPGRADES = {
  data: [
    {
      id: "up1",
      companyId: "c1",
      companyName: "Tashkent Digital Solutions",
      companySlug: "tashkent-digital",
      requesterId: "u1",
      requesterLabel: "Aziz Yusupov",
      requesterEmail: "owner@tashkent.uz",
      planCode: "pro",
      planName: "Pro",
      priceUzs: 1_200_000,
      source: "billing_page",
      requestNote: "Хотим перейти на Pro до конца недели.",
      createdAt: T0,
    },
  ],
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(input: RequestInfo | URL): Response | null {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const path = url.split("?")[0];

  if (path.includes("/api/operator/dashboard")) return jsonResponse(DASHBOARD);
  if (/\/api\/operator\/companies\/[^/]+\/notes$/.test(path)) return jsonResponse({ notes: [] });
  if (/\/api\/operator\/companies\/[^/]+$/.test(path)) return jsonResponse(COMPANY_DETAIL);
  if (path.includes("/api/operator/companies")) return jsonResponse(COMPANIES);
  if (path.includes("/api/operator/incidents")) return jsonResponse(INCIDENTS);
  if (path.includes("/api/operator/team")) return jsonResponse(TEAM);
  if (path.includes("/api/operator/settings")) return jsonResponse(SETTINGS);
  if (path.includes("/api/operator/promotions")) return jsonResponse(PROMOTIONS);
  if (path.includes("/api/operator/subscription-upgrades")) return jsonResponse(UPGRADES);
  if (path.includes("/api/operator/hh/connection"))
    return jsonResponse({
      health: { configured: true, scope: "platform", status: "ok", employerName: "TezHR Platform" },
      baseConfigured: true,
    });
  return null;
}

function installFetchMock() {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __opMockInstalled?: boolean };
  if (w.__opMockInstalled) return;
  w.__opMockInstalled = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const mocked = mockFetch(input);
    if (mocked) return mocked;
    return real(input, init);
  };
}

export type OperatorView =
  | "dashboard"
  | "companies"
  | "inbox"
  | "incidents"
  | "settings"
  | "company-detail"
  | "impersonation";

export function OperatorDevHarness({
  view,
  theme,
}: {
  view: OperatorView;
  theme: "light" | "dark";
}) {
  // Patch fetch before any child mounts (lazy initializer runs in render).
  useState(() => {
    installFetchMock();
    return null;
  });

  // Mirror the theme onto <html> so Radix portals inherit the token set, exactly
  // as OperatorShell does in production.
  useEffect(() => {
    document.documentElement.setAttribute("data-operator-theme", theme);
    return () => document.documentElement.removeAttribute("data-operator-theme");
  }, [theme]);

  let content: React.ReactNode;
  if (view === "dashboard") {
    content = <DashboardView initial={DASHBOARD} />;
  } else if (view === "companies") {
    content = <OperatorCompaniesPage />;
  } else if (view === "inbox") {
    content = (
      <div className="flex flex-col gap-4">
        <PendingSubscriptionUpgrades />
        <PendingPromotions />
        <InboxView
          messages={INBOX_MESSAGES}
          unreadCount={1}
          filter="unread"
          page={1}
          totalPages={1}
        />
      </div>
    );
  } else if (view === "incidents") {
    content = <IncidentsPage />;
  } else if (view === "settings") {
    content = <SettingsPage />;
  } else if (view === "company-detail") {
    content = <CompanyDetailPage />;
  } else {
    content = (
      <ImpersonationBannerView
        targetLabel="Aziz Yusupov"
        operatorLabel="operator@tezhr.uz"
        startedAt={T0}
      />
    );
  }

  return (
    <div
      data-theme={theme}
      data-operator-preview={view}
      className={`operator-shell-root tezhr ${theme === "dark" ? "dark" : ""} min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]`}
    >
      <ToastProvider>
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{content}</div>
      </ToastProvider>
    </div>
  );
}
