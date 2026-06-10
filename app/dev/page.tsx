import { notFound } from "next/navigation";
import { DesignSystemReview } from "@/components/dev/design-system-review";

export default function DevPage() {
  if (process.env.NODE_ENV !== "development" && process.env.ENABLE_DESIGN_REVIEW !== "1") {
    notFound();
  }
  return <DesignSystemReview />;
}
