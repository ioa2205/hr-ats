import { z } from "zod/v4";

export const candidateSchema = z.object({
  full_name: z.string().min(1).max(200),
  phone_number: z.string().regex(/^\+998\d{9}$/, {
    message: "Phone must be in +998XXXXXXXXX format",
  }),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
