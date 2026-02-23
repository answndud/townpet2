import { PetLifeStage, PetSizeClass, PetSpecies } from "@prisma/client";
import { z } from "zod";

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

export const petCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  species: z.nativeEnum(PetSpecies),
  breedCode: optionalTrimmedString,
  breedLabel: optionalTrimmedString,
  sizeClass: z.nativeEnum(PetSizeClass).default(PetSizeClass.UNKNOWN),
  lifeStage: z.nativeEnum(PetLifeStage).default(PetLifeStage.UNKNOWN),
  age: z.coerce.number().int().min(0).max(40).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) =>
        value.length === 0 ||
        value.startsWith("/uploads/") ||
        value.startsWith("https://") ||
        value.startsWith("http://"),
      "반려동물 이미지 URL 형식이 올바르지 않습니다.",
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
