import { OperatorShell } from "@/components/operator/operator-shell";
import { ToastProvider } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Runs before React hydrates. Reads the operator's stored theme (or system
 * preference) and stamps <html data-operator-theme> so Radix portals and
 * M3-token pages render dark immediately — no light-mode flash.
 */
const THEME_PRIMER = `
try {
  var t = localStorage.getItem('tezhr-operator-theme');
  if (t !== 'dark' && t !== 'light') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-operator-theme', t);
} catch (e) {}
`;

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already gates /operator/* on the is_operator
  // JWT claim. We re-check here so a misconfigured matcher never leaks the
  // console.
  const user = await requireOperator();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single();

  const email = profile?.email ?? user.email ?? "";
  const fullName = profile?.full_name ?? null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_PRIMER }} />
      <ToastProvider>
        <OperatorShell email={email} fullName={fullName}>
          {children}
        </OperatorShell>
      </ToastProvider>
    </>
  );
}
