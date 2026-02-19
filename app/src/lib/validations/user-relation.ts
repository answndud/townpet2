import { z } from "zod";

export const userRelationTargetSchema = z.object({
  targetUserId: z.string().cuid(),
});

export type UserRelationTargetInput = z.infer<typeof userRelationTargetSchema>;
