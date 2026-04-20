import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell width="sm">{children}</AuthShell>;
}
