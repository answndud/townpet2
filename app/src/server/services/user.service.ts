import { prisma } from "@/lib/prisma";
import {
  neighborhoodSelectSchema,
  profileImageUpdateSchema,
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
    data: {
      nickname: parsed.data.nickname,
      bio:
        parsed.data.bio && parsed.data.bio.trim().length > 0
          ? parsed.data.bio.trim()
          : null,
    },
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

  const neighborhoods = await prisma.neighborhood.findMany({
    where: { id: { in: parsed.data.neighborhoodIds } },
    select: { id: true },
  });

  if (neighborhoods.length !== parsed.data.neighborhoodIds.length) {
    throw new ServiceError("동네 정보를 찾을 수 없습니다.", "NEIGHBORHOOD_NOT_FOUND", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.userNeighborhood.deleteMany({
      where: {
        userId,
        neighborhoodId: {
          notIn: parsed.data.neighborhoodIds,
        },
      },
    });

    for (const neighborhoodId of parsed.data.neighborhoodIds) {
      await tx.userNeighborhood.upsert({
        where: {
          userId_neighborhoodId: {
            userId,
            neighborhoodId,
          },
        },
        update: {
          isPrimary: neighborhoodId === parsed.data.primaryNeighborhoodId,
        },
        create: {
          userId,
          neighborhoodId,
          isPrimary: neighborhoodId === parsed.data.primaryNeighborhoodId,
        },
      });
    }

    return tx.userNeighborhood.updateMany({
      where: {
        userId,
        neighborhoodId: parsed.data.primaryNeighborhoodId,
      },
      data: { isPrimary: true },
    });
  });
}

type UpdateProfileImageParams = {
  userId: string;
  input: unknown;
};

export async function updateProfileImage({ userId, input }: UpdateProfileImageParams) {
  const parsed = profileImageUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("프로필 이미지 입력이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  return prisma.user.update({
    where: { id: userId },
    data: { image: parsed.data.imageUrl },
    select: { id: true, image: true },
  });
}
