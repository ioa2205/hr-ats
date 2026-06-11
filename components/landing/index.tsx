import "./landing.css";
import { getT } from "@/lib/i18n/server";
import { FinalCTA } from "./final/final-cta";
import { LandingTracker } from "./instrumentation/landing-tracker";
import { Hero } from "./hero/hero";
import { HowItWorks } from "./how/how";
import { CandidatesRibbon } from "./candidates/candidates-ribbon";
import { PainSolution } from "./pain/pain";
import { Pricing } from "./pricing/pricing";
import { Proof } from "./proof/proof";
import { LandingNav } from "./shell/nav";
import { LandingFooter } from "./shell/footer";
import { Showcase } from "./showcase/showcase";
import { Sourcing } from "./sourcing/sourcing-section";
import { Why } from "./why/why";

export async function TezhrLanding() {
  const { locale } = await getT();
  return (
    <div className="tezhr-landing">
      <LandingNav />
      <Hero />
      <Why />
      <HowItWorks />
      <Showcase />
      <Sourcing />
      <PainSolution />
      <Proof />
      <Pricing />
      <FinalCTA />
      <CandidatesRibbon />
      <LandingFooter />
      <LandingTracker locale={locale} />
    </div>
  );
}
