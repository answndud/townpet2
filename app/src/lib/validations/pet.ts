import { PetLifeStage, PetSizeClass, PetSpecies } from "@prisma/client";
import { z } from "zod";

import { isTrustedUploadUrl } from "@/lib/upload-url";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional(),
);

const optionalBreedCode = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : undefined;
  },
  z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "품종 코드는 영문 대문자, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.")
    .optional(),
);

const currentYear = new Date().getFullYear();

export const petCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  species: z.nativeEnum(PetSpecies),
  breedCode: optionalBreedCode,
  breedLabel: optionalTrimmedString,
  sizeClass: z.nativeEnum(PetSizeClass).optional(),
  lifeStage: z.nativeEnum(PetLifeStage).optional(),
  weightKg: z.coerce.number().min(0.1).max(200).optional(),
  birthYear: z.coerce.number().int().min(1900).max(currentYear).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => value.length === 0 || isTrustedUploadUrl(value),
      "허용된 업로드 이미지 URL만 사용할 수 있습니다.",
    )
    .optional(),
  bio: z.string().trim().max(240).optional(),
});

export const petUpdateSchema = petCreateSchema.extend({
  petId: z.string().cuid(),
});

export const petDeleteSchema = z.object({
  petId: z.string().cuid(),
});

export type PetCreateInput = z.infer<typeof petCreateSchema>;
export type PetUpdateInput = z.infer<typeof petUpdateSchema>;
export type PetDeleteInput = z.infer<typeof petDeleteSchema>;
