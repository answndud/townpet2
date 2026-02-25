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

function parseRegionSelection(value: string) {
  const [city, district] = value.split("::");
  if (!city || !district) {
    return null;
  }

  const trimmedCity = city.trim();
  const trimmedDistrict = district.trim();
  if (!trimmedCity || !trimmedDistrict) {
    return null;
  }

  return {
    city: trimmedCity,
    district: trimmedDistrict,
  };
}

async function resolveNeighborhoodId(selection: string) {
  const existingById = await prisma.neighborhood.findUnique({
    where: { id: selection },
    select: { id: true },
  });

  if (existingById) {
    return existingById.id;
  }

  const region = parseRegionSelection(selection);
  if (!region) {
    return null;
  }

  const seeded = await prisma.neighborhood.upsert({
    where: {
      name_city_district: {
        name: region.district,
        city: region.city,
        district: region.district,
      },
    },
    update: {},
    create: {
      name: region.district,
      city: region.city,
      district: region.district,
    },
    select: { id: true },
  });

  return seeded.id;
}

export async function setPrimaryNeighborhood({
  userId,
  input,
}: UpdateNeighborhoodParams) {
  const parsed = neighborhoodSelectSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("동네 선택이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const resolvedIds = await Promise.all(
    parsed.data.neighborhoodIds.map((item) => resolveNeighborhoodId(item)),
  );

  if (resolvedIds.some((item) => !item)) {
    throw new ServiceError("동네 정보를 찾을 수 없습니다.", "NEIGHBORHOOD_NOT_FOUND", 404);
  }

  const normalizedNeighborhoodIds = Array.from(new Set(resolvedIds)) as string[];
  const primaryResolvedId = await resolveNeighborhoodId(parsed.data.primaryNeighborhoodId);
  if (!primaryResolvedId || !normalizedNeighborhoodIds.includes(primaryResolvedId)) {
    throw new ServiceError("대표 동네를 찾을 수 없습니다.", "NEIGHBORHOOD_NOT_FOUND", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.userNeighborhood.deleteMany({
      where: {
        userId,
        neighborhoodId: {
          notIn: normalizedNeighborhoodIds,
        },
      },
    });

    for (const neighborhoodId of normalizedNeighborhoodIds) {
      await tx.userNeighborhood.upsert({
        where: {
          userId_neighborhoodId: {
            userId,
            neighborhoodId,
          },
        },
        update: {
          isPrimary: neighborhoodId === primaryResolvedId,
        },
        create: {
          userId,
          neighborhoodId,
          isPrimary: neighborhoodId === primaryResolvedId,
        },
      });
    }

    return tx.userNeighborhood.updateMany({
      where: {
        userId,
        neighborhoodId: primaryResolvedId,
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
