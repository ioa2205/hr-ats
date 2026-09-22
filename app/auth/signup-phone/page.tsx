import type { Metadata } from "next";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";

export const metadata: Metadata = {
  title: "Sign up with phone · TezHR",
};

function safeNextPath(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function SignupPhonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next);
  const pinnedEmail = typeof sp.email === "string" ? sp.email : undefined;
  return <PhoneOtpForm nextPath={nextPath} pinnedEmail={pinnedEmail} />;
}
