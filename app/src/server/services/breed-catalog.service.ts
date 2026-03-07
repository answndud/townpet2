import { prisma } from "@/lib/prisma";
import {
  breedCatalogDeleteSchema,
  breedCatalogUpsertSchema,
} from "@/lib/validations/breed-catalog";
import { ServiceError } from "@/server/services/service-error";

type BreedCatalogMutationParams = {
  input: unknown;
};

function normalizeAliases(value: string[]) {
  const unique = new Set<string>();

  for (const alias of value) {
    const normalized = alias.trim();
    if (normalized.length === 0) {
      continue;
    }
    unique.add(normalized);
  }

  return Array.from(unique);
}

export async function upsertBreedCatalogEntry({ input }: BreedCatalogMutationParams) {
  const parsed = breedCatalogUpsertSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("품종 사전 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const aliases = normalizeAliases(parsed.data.aliases);

  return prisma.breedCatalog.upsert({
    where: {
      species_code: {
        species: parsed.data.species,
        code: parsed.data.code,
      },
    },
    create: {
      species: parsed.data.species,
      code: parsed.data.code,
      labelKo: parsed.data.labelKo,
      aliases,
      defaultSize: parsed.data.defaultSize,
      isActive: parsed.data.isActive,
    },
    update: {
      labelKo: parsed.data.labelKo,
      aliases,
      defaultSize: parsed.data.defaultSize,
      isActive: parsed.data.isActive,
    },
  });
}

export async function deleteBreedCatalogEntry({ input }: BreedCatalogMutationParams) {
  const parsed = breedCatalogDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("삭제 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.breedCatalog.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  });
  if (!existing) {
    throw new ServiceError("품종 사전 entry를 찾을 수 없습니다.", "BREED_ENTRY_NOT_FOUND", 404);
  }

  return prisma.breedCatalog.delete({
    where: { id: parsed.data.id },
    select: { id: true },
  });
}
