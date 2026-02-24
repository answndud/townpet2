import { PostType } from "@prisma/client";
import { z } from "zod";

import { GUEST_MAX_IMAGE_COUNT } from "@/lib/guest-post-policy";
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

export const guestPostPolicyUpdateSchema = z.object({
  blockedPostTypes: z.array(z.nativeEnum(PostType)).max(13),
  maxImageCount: z.coerce.number().int().min(0).max(10).default(GUEST_MAX_IMAGE_COUNT),
  allowLinks: z.boolean(),
  allowContact: z.boolean(),
  enforceGlobalScope: z.boolean(),
  postRateLimit10m: z.coerce.number().int().min(1).max(200),
  postRateLimit1h: z.coerce.number().int().min(1).max(1000),
  postRateLimit24h: z.coerce.number().int().min(1).max(5000),
  uploadRateLimit10m: z.coerce.number().int().min(1).max(200),
  banThreshold24h: z.coerce.number().int().min(1).max(100),
  banThreshold7dMedium: z.coerce.number().int().min(1).max(500),
  banThreshold7dHigh: z.coerce.number().int().min(1).max(500),
  banDurationHoursShort: z.coerce.number().int().min(1).max(24 * 365),
  banDurationHoursMedium: z.coerce.number().int().min(1).max(24 * 365),
  banDurationHoursLong: z.coerce.number().int().min(1).max(24 * 365),
});

export type GuestPostPolicyUpdateInput = z.infer<
  typeof guestPostPolicyUpdateSchema
>;
