import { z } from "zod";

export const profileUpdateSchema = z.object({
  nickname: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9가-힣_-]+$/, "닉네임은 한글/영문/숫자/특수기호(-,_)만 가능합니다."),
});

export const neighborhoodSelectSchema = z.object({
  neighborhoodId: z.string().cuid(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type NeighborhoodSelectInput = z.infer<typeof neighborhoodSelectSchema>;
