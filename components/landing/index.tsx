import "./landing.css";
import { getT } from "@/lib/i18n/server";
import { CraftHome } from "./craft-home";
import { LandingTracker } from "./instrumentation/landing-tracker";
import { LandingNav } from "./shell/nav";
import { LandingFooter } from "./shell/footer";

export async function TezhrLanding() {
  const { locale } = await getT();
  return (
    <div className="tezhr-landing">
      <LandingNav />
      <CraftHome />
      <LandingFooter />
      <LandingTracker locale={locale} />
    </div>
  );
}
