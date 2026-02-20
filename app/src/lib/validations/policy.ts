import { PostType } from "@prisma/client";
import { z } from "zod";

import { MAX_POLICY_HOURS } from "@/lib/new-user-safety-policy";

export const guestReadPolicyUpdateSchema = z.object({
  loginRequiredTypes: z.array(z.nativeEnum(PostType)).max(13),
});

export type GuestReadPolicyUpdateInput = z.infer<
  typeof guestReadPolicyUpdateSchema
>;

export const forbiddenKeywordPolicyUpdateSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(40)).max(300),
});

export type ForbiddenKeywordPolicyUpdateInput = z.infer<
  typeof forbiddenKeywordPolicyUpdateSchema
>;

export const newUserSafetyPolicyUpdateSchema = z.object({
  minAccountAgeHours: z.coerce.number().int().min(0).max(MAX_POLICY_HOURS),
  restrictedPostTypes: z.array(z.nativeEnum(PostType)).max(13),
  contactBlockWindowHours: z.coerce.number().int().min(0).max(MAX_POLICY_HOURS),
});

export type NewUserSafetyPolicyUpdateInput = z.infer<
  typeof newUserSafetyPolicyUpdateSchema
>;
