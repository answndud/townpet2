import type { PetSpecies } from "@prisma/client";

import {
  findDefaultBreedCatalogEntry,
  mergeBreedCatalogEntries,
  type BreedCatalogEntry,
  type EffectiveBreedCatalogEntry,
  type PersistedBreedCatalogEntry,
} from "@/lib/breed-catalog";
import { prisma } from "@/lib/prisma";
import { PET_SPECIES_VALUES, type PetSpeciesValue } from "@/lib/pet-profile";

function toPersistedBreedCatalogEntry(input: {
  id: string;
  species: PetSpecies | string;
  code: string;
  labelKo: string;
  aliases: string[];
  defaultSize: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PersistedBreedCatalogEntry {
  return {
    id: input.id,
    species: input.species as PetSpeciesValue,
    code: input.code.trim().toUpperCase(),
    labelKo: input.labelKo.trim(),
    aliases: input.aliases.map((alias) => alias.trim()).filter((alias) => alias.length > 0),
    defaultSize: input.defaultSize as BreedCatalogEntry["defaultSize"],
    isActive: input.isActive,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function toPlainBreedCatalogEntry(
  input: Pick<BreedCatalogEntry, "species" | "code" | "labelKo" | "aliases" | "defaultSize">,
): BreedCatalogEntry {
  return {
    species: input.species,
    code: input.code,
    labelKo: input.labelKo,
    aliases: input.aliases,
    defaultSize: input.defaultSize,
  };
}

export async function listBreedCatalogBySpecies(
  species: PetSpeciesValue,
): Promise<BreedCatalogEntry[]> {
  const items = await prisma.breedCatalog.findMany({
    where: {
      species,
    },
    orderBy: [{ updatedAt: "asc" }, { code: "asc" }],
  });

  return mergeBreedCatalogEntries(
    species,
    items.map((item) => toPersistedBreedCatalogEntry(item)),
  ).map(toPlainBreedCatalogEntry);
}

export async function listBreedCatalogGroupedBySpecies(): Promise<
  Record<PetSpeciesValue, BreedCatalogEntry[]>
> {
  const effective = await listEffectiveBreedCatalogGroupedBySpecies();
  return Object.fromEntries(
    Object.entries(effective).map(([species, entries]) => [
      species,
      entries.map(toPlainBreedCatalogEntry),
    ]),
  ) as Record<PetSpeciesValue, BreedCatalogEntry[]>;
}

export async function listEffectiveBreedCatalogGroupedBySpecies(): Promise<
  Record<PetSpeciesValue, EffectiveBreedCatalogEntry[]>
> {
  const items = await prisma.breedCatalog.findMany({
    orderBy: [{ species: "asc" }, { updatedAt: "asc" }, { code: "asc" }],
  });

  const persistedEntries = items.map((item) => toPersistedBreedCatalogEntry(item));
  return PET_SPECIES_VALUES.reduce(
    (acc, species) => ({
      ...acc,
      [species]: mergeBreedCatalogEntries(species, persistedEntries),
    }),
    {} as Record<PetSpeciesValue, EffectiveBreedCatalogEntry[]>,
  );
}

export async function listBreedCatalogAdminEntries(): Promise<
  Array<
    PersistedBreedCatalogEntry & {
      source: "override" | "custom";
    }
  >
> {
  const items = await prisma.breedCatalog.findMany({
    orderBy: [{ species: "asc" }, { code: "asc" }, { updatedAt: "desc" }],
  });

  return items.map((item) => {
    const entry = toPersistedBreedCatalogEntry(item) as PersistedBreedCatalogEntry;
    return {
      ...entry,
      source: findDefaultBreedCatalogEntry(entry.species, entry.code) ? "override" : "custom",
    };
  });
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
    },
    orderBy: { updatedAt: "desc" },
  });

  if (item) {
    const entry = toPersistedBreedCatalogEntry(item);
    return entry.isActive ? toPlainBreedCatalogEntry(entry) : null;
  }

  return findDefaultBreedCatalogEntry(species, normalizedCode);
}
