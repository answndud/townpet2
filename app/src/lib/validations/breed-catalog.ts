import { PetSizeClass, PetSpecies } from "@prisma/client";
import { z } from "zod";

const breedCatalogCodeSchema = z.preprocess(
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
    .regex(/^[A-Z0-9_-]+$/, "품종 코드는 영문 대문자, 숫자, 밑줄, 하이픈만 사용할 수 있습니다."),
);

const breedCatalogLabelSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().min(1).max(40),
);

const breedCatalogAliasesSchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) {
      return value;
    }
    return value
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => typeof item !== "string" || item.length > 0);
  },
  z.array(z.string().min(1).max(40)).max(12).optional().default([]),
);

export const breedCatalogUpsertSchema = z.object({
  species: z.nativeEnum(PetSpecies),
  code: breedCatalogCodeSchema,
  labelKo: breedCatalogLabelSchema,
  aliases: breedCatalogAliasesSchema,
  defaultSize: z.nativeEnum(PetSizeClass),
  isActive: z.boolean().default(true),
});

export const breedCatalogDeleteSchema = z.object({
  id: z.string().cuid(),
});

export type BreedCatalogUpsertInput = z.infer<typeof breedCatalogUpsertSchema>;
export type BreedCatalogDeleteInput = z.infer<typeof breedCatalogDeleteSchema>;
