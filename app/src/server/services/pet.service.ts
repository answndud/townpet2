import { prisma } from "@/lib/prisma";
import {
  petCreateSchema,
  petDeleteSchema,
  petUpdateSchema,
} from "@/lib/validations/pet";
import { ServiceError } from "@/server/services/service-error";

type PetMutationParams = {
  userId: string;
  input: unknown;
};

function normalizePetData(data: {
  name: string;
  species: string;
  age?: number;
  imageUrl?: string;
  bio?: string;
}) {
  return {
    name: data.name.trim(),
    species: data.species.trim(),
    age: data.age ?? null,
    imageUrl: data.imageUrl?.trim() ? data.imageUrl.trim() : null,
    bio: data.bio?.trim() ? data.bio.trim() : null,
  };
}

export async function createPet({ userId, input }: PetMutationParams) {
  const parsed = petCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("반려동물 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const currentCount = await prisma.pet.count({
    where: { userId },
  });
  if (currentCount >= 10) {
    throw new ServiceError("반려동물은 최대 10마리까지 등록할 수 있습니다.", "PET_LIMIT_EXCEEDED", 400);
  }

  return prisma.pet.create({
    data: {
      userId,
      ...normalizePetData(parsed.data),
    },
  });
}

export async function updatePet({ userId, input }: PetMutationParams) {
  const parsed = petUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("반려동물 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.pet.findUnique({
    where: { id: parsed.data.petId },
    select: { id: true, userId: true },
  });
  if (!existing) {
    throw new ServiceError("반려동물 정보를 찾을 수 없습니다.", "PET_NOT_FOUND", 404);
  }
  if (existing.userId !== userId) {
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.pet.update({
    where: { id: parsed.data.petId },
    data: normalizePetData(parsed.data),
  });
}

export async function deletePet({ userId, input }: PetMutationParams) {
  const parsed = petDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("삭제 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.pet.findUnique({
    where: { id: parsed.data.petId },
    select: { id: true, userId: true },
  });
  if (!existing) {
    throw new ServiceError("반려동물 정보를 찾을 수 없습니다.", "PET_NOT_FOUND", 404);
  }
  if (existing.userId !== userId) {
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.pet.delete({
    where: { id: parsed.data.petId },
    select: { id: true },
  });
}
