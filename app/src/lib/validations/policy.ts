import { PostType } from "@prisma/client";
import { z } from "zod";

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
