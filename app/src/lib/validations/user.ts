import { z } from "zod";

import { isTrustedUploadUrl } from "@/lib/upload-url";

export const profileUpdateSchema = z.object({
  nickname: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9가-힣_-]+$/, "닉네임은 한글/영문/숫자/특수기호(-,_)만 가능합니다."),
  bio: z.string().trim().max(240).optional(),
  showPublicPosts: z.boolean().optional(),
  showPublicComments: z.boolean().optional(),
  showPublicPets: z.boolean().optional(),
});

export const neighborhoodSelectSchema = z
  .object({
    neighborhoodId: z.string().trim().min(1).max(120).optional(),
    neighborhoodIds: z.array(z.string().trim().min(1).max(120)).max(3).optional(),
    primaryNeighborhoodId: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    const selected = value.neighborhoodIds ?? (value.neighborhoodId ? [value.neighborhoodId] : []);
    const uniqueIds = Array.from(new Set(selected));
    const primaryId = value.primaryNeighborhoodId ?? value.neighborhoodId;

    if (uniqueIds.length > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["neighborhoodIds"],
        message: "동네는 최대 3개까지 선택할 수 있습니다.",
      });
      return;
    }

    if (uniqueIds.length === 0) {
      if (primaryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primaryNeighborhoodId"],
          message: "대표 동네를 지정하려면 동네를 먼저 선택해 주세요.",
        });
      }
      return;
    }

    if (!primaryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryNeighborhoodId"],
        message: "대표 동네를 선택해 주세요.",
      });
      return;
    }

    if (!uniqueIds.includes(primaryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryNeighborhoodId"],
        message: "대표 동네는 선택한 동네 중에서 지정해 주세요.",
      });
    }
  })
  .transform((value) => {
    const neighborhoodIds = Array.from(
      new Set(value.neighborhoodIds ?? (value.neighborhoodId ? [value.neighborhoodId] : [])),
    );
    const fallbackPrimary = neighborhoodIds[0] ?? null;

    return {
      neighborhoodIds,
      primaryNeighborhoodId:
        value.primaryNeighborhoodId ??
        value.neighborhoodId ??
        fallbackPrimary,
    };
  });

export const profileImageUpdateSchema = z.object({
  imageUrl: z
    .string()
    .min(1)
    .max(2048)
    .refine((value) => isTrustedUploadUrl(value), "허용된 업로드 이미지 URL만 사용할 수 있습니다."),
});

export const preferredPetTypesSchema = z
  .object({
    petTypeIds: z.array(z.string().cuid()).max(50),
  })
  .transform((value) => ({
    petTypeIds: Array.from(new Set(value.petTypeIds)),
  }));

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type NeighborhoodSelectInput = z.infer<typeof neighborhoodSelectSchema>;
export type ProfileImageUpdateInput = z.infer<typeof profileImageUpdateSchema>;
export type PreferredPetTypesInput = z.infer<typeof preferredPetTypesSchema>;
