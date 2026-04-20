import { z } from "zod/v4";

export const sendInviteSchema = z.object({
  email: z.email().max(320),
  role: z.enum(["admin", "recruiter"]),
});

export const changeRoleSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(["admin", "recruiter"]),
});

export const removeMemberSchema = z.object({
  user_id: z.uuid(),
});

export const saveTemplatesSchema = z.object({
  telegram_invite_ru: z.string().max(2000),
  telegram_invite_uz: z.string().max(2000),
  telegram_invite_en: z.string().max(2000),
});
