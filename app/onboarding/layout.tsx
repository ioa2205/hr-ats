import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  return <AuthShell width="md">{children}</AuthShell>;
}
