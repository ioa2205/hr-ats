import { z } from "zod/v4";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
