import { z } from "zod/v4";

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be at most 72 characters" });

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" })
    .max(120),
});

export const requestPasswordResetSchema = z.object({
  email: z.email(),
});

export const completePasswordResetSchema = z.object({
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetSchema>;

// Phone OTP schemas
export const phoneSchema = z
  .string()
  .regex(/^\+998\d{9}$/, { message: "Phone must be +998 followed by 9 digits" });

export const phoneOtpStartSchema = z.object({
  phone: phoneSchema,
});

export const phoneOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" }),
});

export const phoneSignupCompleteSchema = z.object({
  phone: phoneSchema,
  email: z.email(),
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" })
    .max(120),
});

export type PhoneOtpStartInput = z.infer<typeof phoneOtpStartSchema>;
export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;
export type PhoneSignupCompleteInput = z.infer<typeof phoneSignupCompleteSchema>;
