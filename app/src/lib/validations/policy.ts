import { PostType } from "@prisma/client";
import { z } from "zod";

export const guestReadPolicyUpdateSchema = z.object({
  loginRequiredTypes: z.array(z.nativeEnum(PostType)).max(13),
});

export type GuestReadPolicyUpdateInput = z.infer<
  typeof guestReadPolicyUpdateSchema
>;
