import { z } from "zod/v4";

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Company name must be at least 2 characters" })
    .max(100, { message: "Company name must be at most 100 characters" }),
  default_locale: z.enum(["ru", "uz", "en"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, { message: "Invite token is required" }),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
