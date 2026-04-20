"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut, MoreHorizontal, RefreshCw, Search, ShieldCheck, ShieldOff, UserCircle2, UserCog } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  locale: string;
  is_operator: boolean;
  created_at: string;
  current_company_id: string | null;
  company: { id: string; name: string } | null;
}

export default function OperatorUsersPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonAction, setReasonAction] = useState<
    { kind: "promote" | "demote"; user: UserRow } | null
  >(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/operator/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRows(json.data);
        setTotal(json.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / 20);

  const handleImpersonate = async () => {
    if (!target || !reason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/operator/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: target.id, reason }),
      });
      if (res.ok) {
        const json = await res.json();
        window.location.href = json.signInUrl;
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: err?.error ?? t("operator.users.toast.impersonation_failed"),
        });
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-on-surface text-2xl font-semibold">{t("admin.users.title")}</h1>
        <Button variant="secondary" size="sm" onClick={fetchUsers} aria-label={t("admin.refresh")}>
          <RefreshCw className="h-4 w-4" />
          {t("admin.refresh")}
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <Input
          label={t("operator.users.search_label")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("operator.users.search_placeholder")}
          startAdornment={<Search className="h-4 w-4" />}
        />
      </form>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container h-12 w-full animate-pulse rounded-[var(--radius-md)]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UserCircle2 />}
          title={t("admin.users.empty")}
          description={t("admin.users.empty_description")}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("operator.users.col.name")}</TableHead>
                <TableHead>{t("operator.users.col.email")}</TableHead>
                <TableHead>{t("operator.users.col.company")}</TableHead>
                <TableHead>{t("operator.users.col.role")}</TableHead>
                <TableHead>{t("operator.users.col.joined")}</TableHead>
                <TableHead className="text-right">{t("operator.users.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                  <TableCell className="text-on-surface-variant">{u.email}</TableCell>
                  <TableCell>{u.company?.name ?? "—"}</TableCell>
                  <TableCell>
                    {u.is_operator ? (
                      <Badge tone="danger" size="sm">
                        {t("operator.enum.role.operator")}
                      </Badge>
                    ) : (
                      <Badge size="sm">{t("operator.enum.role.user")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-on-surface-variant text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={t("operator.users.open_actions")}
                          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)]"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={u.is_operator}
                          onSelect={() => {
                            setTarget(u);
                            setReason("");
                          }}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          {t("operator.users.action.impersonate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            const res = await fetch(
                              `/api/operator/users/${u.id}/reset-password`,
                              { method: "POST" },
                            );
                            toast({
                              variant: res.ok ? "success" : "error",
                              title: res.ok
                                ? t("operator.users.toast.reset_sent")
                                : t("operator.users.toast.reset_failed"),
                            });
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {t("operator.users.action.reset_password")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={async () => {
                            if (
                              !confirm(
                                t("operator.users.confirm_sign_out", { email: u.email }),
                              )
                            )
                              return;
                            const res = await fetch(
                              `/api/operator/users/${u.id}/force-sign-out`,
                              { method: "POST" },
                            );
                            toast({
                              variant: res.ok ? "success" : "error",
                              title: res.ok
                                ? t("operator.users.toast.signed_out")
                                : t("operator.users.toast.sign_out_failed"),
                            });
                          }}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {t("operator.users.action.force_sign_out")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.is_operator ? (
                          <DropdownMenuItem
                            onSelect={() => setReasonAction({ kind: "demote", user: u })}
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            {t("operator.users.action.propose_demote")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => setReasonAction({ kind: "promote", user: u })}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t("operator.users.action.propose_promote")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-on-surface-variant text-sm">
                {t("operator.users.total", { n: String(total) })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("common.previous")}
                </Button>
                <span className="text-on-surface-variant flex items-center text-sm">
                  {t("operator.users.pagination", {
                    page: String(page),
                    total: String(totalPages),
                  })}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!reasonAction}
        onOpenChange={(open) => {
          if (!open) {
            setReasonAction(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonAction?.kind === "promote"
                ? t("operator.users.dialog.propose_promote_title", {
                    email: reasonAction?.user.email ?? "",
                  })
                : t("operator.users.dialog.propose_demote_title", {
                    email: reasonAction?.user.email ?? "",
                  })}
            </DialogTitle>
            <DialogDescription>{t("operator.users.dialog.propose_desc")}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Textarea
              label={t("operator.users.dialog.reason_label")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReasonAction(null)}>
              {t("operator.users.dialog.cancel")}
            </Button>
            <Button
              loading={busy}
              disabled={reason.trim().length < 10}
              onClick={async () => {
                if (!reasonAction) return;
                setBusy(true);
                try {
                  const res = await fetch(
                    `/api/operator/users/${reasonAction.user.id}/promote`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ kind: reasonAction.kind, reason }),
                    },
                  );
                  if (res.ok) {
                    toast({
                      variant: "success",
                      title: t("operator.users.toast.submitted"),
                    });
                    setReasonAction(null);
                    setReason("");
                  } else {
                    const j = await res.json().catch(() => ({}));
                    toast({
                      variant: "error",
                      title: j?.error ?? t("operator.users.toast.submit_failed"),
                    });
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("operator.users.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("operator.users.dialog.impersonate_title", { email: target?.email ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {t("operator.users.dialog.impersonate_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Textarea
              label={t("operator.users.dialog.impersonate_reason_label")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("operator.users.dialog.impersonate_placeholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setTarget(null);
                setReason("");
              }}
            >
              {t("operator.users.dialog.cancel")}
            </Button>
            <Button onClick={handleImpersonate} loading={busy} disabled={!reason.trim()}>
              {t("operator.users.dialog.start_session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
