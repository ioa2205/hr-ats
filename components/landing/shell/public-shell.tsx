import type { ReactNode } from "react";
import { LandingNav } from "./nav";
import { LandingFooter } from "./footer";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="tezhr-landing">
      <LandingNav />
      {children}
      <LandingFooter />
    </div>
  );
}
