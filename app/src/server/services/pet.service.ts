import { prisma } from "@/lib/prisma";
import { normalizePetBreedCode } from "@/lib/pet-profile";
import { getUploadProxyPath } from "@/lib/upload-url";
import {
  petCreateSchema,
  petDeleteSchema,
  petUpdateSchema,
} from "@/lib/validations/pet";
import { findBreedCatalogEntryBySpeciesAndCode } from "@/server/queries/breed-catalog.queries";
import { syncAudienceSegmentsForUserTx } from "@/server/services/audience-segment.service";
import { ServiceError } from "@/server/services/service-error";
import {
  attachUploadUrls,
  releaseUploadUrlsIfUnreferenced,
} from "@/server/upload-asset.service";

type PetMutationParams = {
  userId: string;
  input: unknown;
};

async function normalizePetData(data: {
  name: string;
  species:
    | "DOG"
    | "CAT"
    | "BIRD"
    | "REPTILE"
    | "SMALL_PET"
    | "AQUATIC"
    | "AMPHIBIAN"
    | "ARTHROPOD"
    | "SPECIAL_OTHER";
  breedCode?: string;
  breedLabel?: string;
  sizeClass?: "TOY" | "SMALL" | "MEDIUM" | "LARGE" | "GIANT" | "UNKNOWN";
  lifeStage?: "PUPPY_KITTEN" | "YOUNG" | "ADULT" | "SENIOR" | "UNKNOWN";
  weightKg?: number;
  birthYear?: number;
  imageUrl?: string;
  bio?: string;
}) {
  const breedCode = normalizePetBreedCode(data.breedCode);
  const manualBreedLabel = data.breedLabel?.trim() ? data.breedLabel.trim() : null;

  let breedLabel = manualBreedLabel;
  if (breedCode && breedCode !== "UNKNOWN" && breedCode !== "MIXED") {
    const matchedBreed = await findBreedCatalogEntryBySpeciesAndCode(
      data.species,
      breedCode,
    );

    if (matchedBreed) {
      breedLabel = matchedBreed.labelKo;
    } else if (!manualBreedLabel) {
      throw new ServiceError(
        "품종 코드가 품종 사전에 없습니다. 목록에서 다시 선택해 주세요.",
        "INVALID_BREED_CODE",
        400,
      );
    }
  }

  return {
    name: data.name.trim(),
    species: data.species,
    breedCode,
    breedLabel,
    sizeClass: data.sizeClass ?? ("UNKNOWN" as const),
    lifeStage: data.lifeStage ?? ("UNKNOWN" as const),
    age: null,
    weightKg: data.weightKg ?? null,
    birthYear: data.birthYear ?? null,
    imageUrl: data.imageUrl?.trim()
      ? getUploadProxyPath(data.imageUrl.trim()) ?? data.imageUrl.trim()
      : null,
    bio: data.bio?.trim() ? data.bio.trim() : null,
  };
}

export async function createPet({ userId, input }: PetMutationParams) {
  const parsed = petCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("반려동물 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const created = await prisma.$transaction(async (tx) => {
    const currentCount = await tx.pet.count({
      where: { userId },
    });
    if (currentCount >= 10) {
      throw new ServiceError(
        "반려동물은 최대 10마리까지 등록할 수 있습니다.",
        "PET_LIMIT_EXCEEDED",
        400,
      );
    }

    const created = await tx.pet.create({
      data: {
        userId,
        ...(await normalizePetData(parsed.data)),
      },
    });

    await syncAudienceSegmentsForUserTx(tx, userId);
    return created;
  });

  if (created.imageUrl) {
    await attachUploadUrls([created.imageUrl]);
  }

  return created;
}

export async function updatePet({ userId, input }: PetMutationParams) {
  const parsed = petUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("반려동물 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const previousPet = await prisma.pet.findUnique({
    where: { id: parsed.data.petId },
    select: { imageUrl: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.pet.findUnique({
      where: { id: parsed.data.petId },
      select: { id: true, userId: true },
    });
    if (!existing) {
      throw new ServiceError("반려동물 정보를 찾을 수 없습니다.", "PET_NOT_FOUND", 404);
    }
    if (existing.userId !== userId) {
      throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const updated = await tx.pet.update({
      where: { id: parsed.data.petId },
      data: await normalizePetData(parsed.data),
    });

    await syncAudienceSegmentsForUserTx(tx, userId);
    return updated;
  });

  if (updated.imageUrl) {
    await attachUploadUrls([updated.imageUrl]);
  }
  if (previousPet?.imageUrl && previousPet.imageUrl !== updated.imageUrl) {
    void releaseUploadUrlsIfUnreferenced([previousPet.imageUrl]).catch(() => undefined);
  }

  return updated;
}

export async function deletePet({ userId, input }: PetMutationParams) {
  const parsed = petDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("삭제 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existingPet = await prisma.pet.findUnique({
    where: { id: parsed.data.petId },
    select: { imageUrl: true },
  });

  const deleted = await prisma.$transaction(async (tx) => {
    const existing = await tx.pet.findUnique({
      where: { id: parsed.data.petId },
      select: { id: true, userId: true },
    });
    if (!existing) {
      throw new ServiceError("반려동물 정보를 찾을 수 없습니다.", "PET_NOT_FOUND", 404);
    }
    if (existing.userId !== userId) {
      throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const deleted = await tx.pet.delete({
      where: { id: parsed.data.petId },
      select: { id: true },
    });

    await syncAudienceSegmentsForUserTx(tx, userId);
    return deleted;
  });

  if (existingPet?.imageUrl) {
    void releaseUploadUrlsIfUnreferenced([existingPet.imageUrl]).catch(() => undefined);
  }

  return deleted;
}
