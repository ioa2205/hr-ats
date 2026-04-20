import { z } from "zod/v4";

export const LOCATION_KINDS = [
  "google_meet",
  "telegram",
  "phone",
  "office",
  "custom",
] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export const DURATION_MINUTES = [15, 30, 45, 60] as const;
export type DurationMinutes = (typeof DURATION_MINUTES)[number];

export const MIN_SLOT_GAP_MINUTES = 30;

export const CreateInterviewRequestSchema = z
  .object({
    duration_minutes: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
    ]),
    location_kind: z.enum(LOCATION_KINDS),
    location_detail: z.string().trim().max(200).optional().nullable(),
    hr_message: z.string().trim().min(1).max(500).optional().nullable(),
    slot_start_ats: z
      .array(z.iso.datetime({ offset: true }))
      .min(3)
      .max(6),
  })
  .superRefine((val, ctx) => {
    const now = Date.now();
    const ts = val.slot_start_ats.map((s) => new Date(s).getTime());

    ts.forEach((t, idx) => {
      if (Number.isNaN(t)) {
        ctx.addIssue({
          code: "custom",
          message: "slot must be a valid ISO datetime",
          path: ["slot_start_ats", idx],
        });
        return;
      }
      if (t <= now) {
        ctx.addIssue({
          code: "custom",
          message: "slots must be in the future",
          path: ["slot_start_ats", idx],
        });
      }
    });

    const sorted = [...ts].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gapMin = (sorted[i] - sorted[i - 1]) / 60_000;
      if (gapMin < MIN_SLOT_GAP_MINUTES) {
        ctx.addIssue({
          code: "custom",
          message: `slots must be at least ${MIN_SLOT_GAP_MINUTES} minutes apart`,
          path: ["slot_start_ats"],
        });
        break;
      }
    }
  });

export type CreateInterviewRequestInput = z.infer<
  typeof CreateInterviewRequestSchema
>;

export const BookSlotSchema = z.object({
  slot_id: z.uuid(),
});

export const DeclineSchema = z.object({
  reason: z.string().trim().max(300).optional().nullable(),
});

export const PatchInterviewRequestSchema = z.object({
  hr_message: z.string().trim().min(1).max(500).optional().nullable(),
  extend_days: z.number().int().min(1).max(30).optional(),
  reopen: z.literal(true).optional(),
});
