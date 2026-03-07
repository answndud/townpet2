import type { PetSpecies } from "@prisma/client";

import {
  buildDefaultBreedCatalogBySpecies,
  findDefaultBreedCatalogEntry,
  listDefaultBreedCatalogBySpecies,
  type BreedCatalogEntry,
} from "@/lib/breed-catalog";
import { prisma } from "@/lib/prisma";
import type { PetSpeciesValue } from "@/lib/pet-profile";

function toBreedCatalogEntry(input: {
  species: PetSpecies | string;
  code: string;
  labelKo: string;
  aliases: string[];
  defaultSize: string;
}): BreedCatalogEntry {
  return {
    species: input.species as PetSpeciesValue,
    code: input.code.trim().toUpperCase(),
    labelKo: input.labelKo.trim(),
    aliases: input.aliases.map((alias) => alias.trim()).filter((alias) => alias.length > 0),
    defaultSize: input.defaultSize as BreedCatalogEntry["defaultSize"],
  };
}

export async function listBreedCatalogBySpecies(species: PetSpeciesValue) {
  const items = await prisma.breedCatalog.findMany({
    where: {
      species,
      isActive: true,
    },
    orderBy: [{ labelKo: "asc" }, { code: "asc" }],
  });

  if (items.length > 0) {
    return items.map((item) => toBreedCatalogEntry(item));
  }

  return listDefaultBreedCatalogBySpecies(species);
}

export async function listBreedCatalogGroupedBySpecies() {
  const items = await prisma.breedCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ species: "asc" }, { labelKo: "asc" }, { code: "asc" }],
  });

  if (items.length === 0) {
    return buildDefaultBreedCatalogBySpecies();
  }

  const grouped = buildDefaultBreedCatalogBySpecies();
  for (const key of Object.keys(grouped) as PetSpeciesValue[]) {
    grouped[key] = [];
  }

  for (const item of items) {
    const species = item.species as PetSpeciesValue;
    grouped[species].push(toBreedCatalogEntry(item));
  }

  for (const key of Object.keys(grouped) as PetSpeciesValue[]) {
    if (grouped[key].length === 0) {
      grouped[key] = listDefaultBreedCatalogBySpecies(key);
    }
  }

  return grouped;
}

export async function findBreedCatalogEntryBySpeciesAndCode(
  species: PetSpeciesValue,
  code: string | null | undefined,
) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const item = await prisma.breedCatalog.findFirst({
    where: {
      species,
      code: normalizedCode,
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (item) {
    return toBreedCatalogEntry(item);
  }

  return findDefaultBreedCatalogEntry(species, normalizedCode);
}
