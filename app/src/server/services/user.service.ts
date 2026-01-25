import { prisma } from "@/lib/prisma";
import {
  neighborhoodSelectSchema,
  profileUpdateSchema,
} from "@/lib/validations/user";
import { ServiceError } from "@/server/services/service-error";

type UpdateProfileParams = {
  userId: string;
  input: unknown;
};

export async function updateProfile({ userId, input }: UpdateProfileParams) {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("프로필 입력이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { nickname: parsed.data.nickname },
    select: { id: true },
  });

  if (existing && existing.id !== userId) {
    throw new ServiceError("이미 사용 중인 닉네임입니다.", "NICKNAME_TAKEN", 409);
  }

  return prisma.user.update({
    where: { id: userId },
    data: { nickname: parsed.data.nickname },
  });
}

type UpdateNeighborhoodParams = {
  userId: string;
  input: unknown;
};

export async function setPrimaryNeighborhood({
  userId,
  input,
}: UpdateNeighborhoodParams) {
  const parsed = neighborhoodSelectSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("동네 선택이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const neighborhood = await prisma.neighborhood.findUnique({
    where: { id: parsed.data.neighborhoodId },
    select: { id: true },
  });

  if (!neighborhood) {
    throw new ServiceError("동네 정보를 찾을 수 없습니다.", "NEIGHBORHOOD_NOT_FOUND", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.userNeighborhood.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    const existing = await tx.userNeighborhood.findUnique({
      where: {
        userId_neighborhoodId: {
          userId,
          neighborhoodId: parsed.data.neighborhoodId,
        },
      },
    });

    if (existing) {
      return tx.userNeighborhood.update({
        where: { id: existing.id },
        data: { isPrimary: true },
      });
    }

    return tx.userNeighborhood.create({
      data: {
        userId,
        neighborhoodId: parsed.data.neighborhoodId,
        isPrimary: true,
      },
    });
  });
}
