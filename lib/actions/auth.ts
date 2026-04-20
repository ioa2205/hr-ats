"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import {
  signInSchema,
  signUpSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
} from "@/lib/validations/auth";

export type AuthState = { error?: string; ok?: boolean } | null;

async function getOrigin(): Promise<string> {
  if (env.APP_URL) return env.APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.APP_URL;
}

export async function signUpWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: {
        full_name: parsed.data.full_name,
      },
    },
  });

  if (error) {
    logger.warn({ err: error.message }, "[auth] sign-up failed");
    if (error.message.toLowerCase().includes("already")) {
      return { error: "email_taken" };
    }
    return { error: "signup_failed" };
  }

  redirect(`/auth/verify?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signInWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalid_credentials" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn({ err: error.message }, "[auth] sign-in failed");
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "email_not_verified" };
    }
    return { error: "invalid_credentials" };
  }

  const isOperator = data.user?.app_metadata?.is_operator === true;
  redirect(isOperator ? "/operator" : "/hr/dashboard");
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error || !data?.url) {
    logger.error({ err: error?.message }, "[auth] google oauth init failed");
    redirect("/auth/login?error=oauth_failed");
  }

  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "invalid_email" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset`,
  });

  if (error) {
    logger.warn({ err: error.message }, "[auth] password reset request failed");
  }

  return { ok: true };
}

export async function completePasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = completePasswordResetSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalid_password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logger.warn({ err: error.message }, "[auth] password update failed");
    return { error: "reset_failed" };
  }

  redirect("/hr/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function resendVerification(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "invalid_email" };
  }

  const emailLower = parsed.data.email.toLowerCase();

  const minute = await rateLimit({
    key: `verify-resend-min:${emailLower}`,
    limit: 1,
    windowSeconds: 60,
  });
  if (!minute.allowed) {
    return { error: "cooldown" };
  }

  const hour = await rateLimit({
    key: `verify-resend-hour:${emailLower}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!hour.allowed) {
    return { error: "rate_limit" };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });

  if (error) {
    logger.warn(
      { err: error.message, context: "verify-resend" },
      "[auth] resend verification failed",
    );
    return { error: "resend_failed" };
  }

  return { ok: true };
}
