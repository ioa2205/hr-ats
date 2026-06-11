"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from "@/components/ui";
import type { Company, Subscription } from "@/types";
import { NotesPanel } from "@/components/operator/companies/notes-panel";
import { DangerZone } from "@/components/operator/companies/danger-zone";
import { useTranslation } from "@/lib/i18n/provider";
import {
  companyStatusKey,
  companyMemberRoleKey,
  subscriptionStatusKey,
} from "@/lib/operator/enum-labels";

interface CompanyMember {
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UsageRow {
  ai_cost_usd_30d: number | null;
  candidate_count_30d: number | null;
  active_job_count: number | null;
}

interface CompanyDetail {
  company: Company;
  members: CompanyMember[];
  subscription: Subscription | null;
  usage: UsageRow | null;
}

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [impersonateTarget, setImpersonateTarget] = useState<CompanyMember | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/companies/${params.id}`);
      if (res.ok) {
        const json = (await res.json()) as CompanyDetail;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSuspend = async () => {
    if (!data) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/operator/companies/${data.company.id}/suspend`, {
        method: "POST",
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.company_detail.toast.suspended") });
        setSuspendOpen(false);
        await fetchDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: err?.error ?? t("operator.company_detail.toast.suspend_failed"),
        });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!data) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/operator/companies/${data.company.id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.company_detail.toast.activated") });
        await fetchDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: err?.error ?? t("operator.company_detail.toast.activate_failed"),
        });
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateTarget || !impersonateReason.trim()) return;
    setImpersonating(true);
    try {
      const res = await fetch("/api/operator/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: impersonateTarget.user_id,
          reason: impersonateReason,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        window.location.href = json.signInUrl;
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: err?.error ?? t("operator.company_detail.toast.impersonation_failed"),
        });
        setImpersonating(false);
      }
    } catch {
      setImpersonating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--color-surface-subtle)] h-8 w-48 animate-pulse rounded" />
        <div className="bg-[var(--color-surface-subtle)] h-24 w-full animate-pulse rounded-[var(--radius-md)]" />
        <div className="bg-[var(--color-surface-subtle)] h-64 w-full animate-pulse rounded-[var(--radius-md)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/operator/companies")}>
          <ArrowLeft className="h-4 w-4" /> {t("operator.company_detail.back")}
        </Button>
        <p className="text-[var(--color-text-muted)]">{t("operator.company_detail.not_found")}</p>
      </div>
    );
  }

  const { company, members, subscription, usage } = data;
  const suspended = company.status === "suspended";
  const deleted = company.status === "deleted";
  const inactive = suspended || deleted;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/operator/companies"
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t("operator.company_detail.breadcrumb")}
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchDetail}
          aria-label={t("operator.company_detail.refresh")}
        >
          <RefreshCw className="h-4 w-4" /> {t("operator.company_detail.refresh")}
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-[var(--color-text)] text-2xl font-semibold break-words">
              {company.name}
            </h1>
            <Badge
              tone={deleted ? "neutral" : suspended ? "danger" : "success"}
              variant="dot"
              size="sm"
            >
              {t(companyStatusKey(company.status))}
            </Badge>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            {company.slug} ·{" "}
            {t("operator.company_detail.locale", { locale: company.default_locale })}
          </p>
        </div>
        <div className="flex gap-2">
          {inactive ? (
            <Button onClick={handleActivate} loading={actionBusy}>
              <CheckCircle2 className="h-4 w-4" />
              {deleted
                ? t("operator.company_detail.restore")
                : t("operator.company_detail.activate")}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setSuspendOpen(true)} loading={actionBusy}>
              <Ban className="h-4 w-4" />
              {t("operator.company_detail.suspend")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-[var(--color-text-muted)] text-xs">
              {t("operator.company_detail.active_jobs")}
            </p>
            <p className="nums text-[var(--color-text)] text-2xl font-semibold">
              {usage?.active_job_count ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[var(--color-text-muted)] text-xs">
              {t("operator.company_detail.candidates_30d")}
            </p>
            <p className="nums text-[var(--color-text)] text-2xl font-semibold">
              {usage?.candidate_count_30d ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[var(--color-text-muted)] text-xs">
              {t("operator.company_detail.ai_cost_30d")}
            </p>
            <p className="nums text-[var(--color-text)] text-2xl font-semibold">
              ${Number(usage?.ai_cost_usd_30d ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {subscription && (
        <Card>
          <CardContent>
            <h2 className="text-[var(--color-text)] mb-2 text-lg font-medium">
              {t("operator.company_detail.subscription")}
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-[var(--color-text-muted)] text-xs">
                  {t("operator.company_detail.sub_status")}
                </dt>
                <dd>
                  <Badge size="sm">{t(subscriptionStatusKey(subscription.status))}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)] text-xs">
                  {t("operator.company_detail.sub_trial_ends")}
                </dt>
                <dd className="nums">
                  {new Date(subscription.trial_ends_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)] text-xs">
                  {t("operator.company_detail.sub_cv_used")}
                </dt>
                <dd className="nums">
                  {subscription.cv_quota_used} / {subscription.cv_quota_limit}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)] text-xs">
                  {t("operator.company_detail.sub_job_limit")}
                </dt>
                <dd className="nums">{subscription.job_quota_limit}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)] text-xs">
                  {t("operator.company_detail.sub_sourcing_used")}
                </dt>
                <dd className="nums">
                  {subscription.sourcing_quota_used} / {subscription.sourcing_quota_limit}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-[var(--color-text)] text-lg font-medium">
          {t("operator.company_detail.members", { n: String(members.length) })}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("operator.company_detail.col.user")}</TableHead>
              <TableHead>{t("operator.company_detail.col.email")}</TableHead>
              <TableHead>{t("operator.company_detail.col.role")}</TableHead>
              <TableHead>{t("operator.company_detail.col.joined")}</TableHead>
              <TableHead className="text-right">
                {t("operator.company_detail.col.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.profile?.full_name ?? "—"}</TableCell>
                <TableCell className="text-[var(--color-text-muted)]">{m.profile?.email}</TableCell>
                <TableCell>
                  <Badge size="sm">{t(companyMemberRoleKey(m.role))}</Badge>
                </TableCell>
                <TableCell className="text-[var(--color-text-muted)] text-xs">
                  {new Date(m.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImpersonateTarget(m);
                      setImpersonateReason("");
                    }}
                  >
                    {t("operator.company_detail.impersonate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NotesPanel companyId={company.id} />

      <DangerZone
        companyId={company.id}
        companyName={company.name}
        cvQuotaLimit={subscription?.cv_quota_limit ?? null}
        jobQuotaLimit={subscription?.job_quota_limit ?? null}
        sourcingQuotaLimit={subscription?.sourcing_quota_limit ?? null}
        onChanged={fetchDetail}
      />

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("operator.company_detail.suspend_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("operator.company_detail.suspend_dialog.desc", { name: company.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSuspendOpen(false)}>
              {t("operator.company_detail.dialog.cancel")}
            </Button>
            <Button variant="danger" onClick={handleSuspend} loading={actionBusy}>
              <Ban className="h-4 w-4" />
              {t("operator.company_detail.suspend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!impersonateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setImpersonateTarget(null);
            setImpersonateReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("operator.company_detail.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("operator.company_detail.dialog.desc", {
                email: impersonateTarget?.profile?.email ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Textarea
              label={t("operator.company_detail.dialog.reason_label")}
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder={t("operator.company_detail.dialog.placeholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setImpersonateTarget(null);
                setImpersonateReason("");
              }}
            >
              {t("operator.company_detail.dialog.cancel")}
            </Button>
            <Button
              onClick={handleImpersonate}
              loading={impersonating}
              disabled={!impersonateReason.trim()}
            >
              {t("operator.company_detail.dialog.start_session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
