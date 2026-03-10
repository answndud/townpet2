import { prisma } from "@/lib/prisma";
import { getUploadProxyPath } from "@/lib/upload-url";
import {
  getNeighborhoodCityVariants,
  normalizeNeighborhoodCity,
  normalizeNeighborhoodDistrict,
} from "@/lib/neighborhood-region";
import {
  neighborhoodSelectSchema,
  preferredPetTypesSchema,
  profileImageUpdateSchema,
  profileUpdateSchema,
} from "@/lib/validations/user";
import {
  attachUploadUrls,
  releaseUploadUrlsIfUnreferenced,
} from "@/server/upload-asset.service";
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

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      nicknameUpdatedAt: true,
      showPublicPosts: true,
      showPublicComments: true,
      showPublicPets: true,
    },
  });
  if (!currentUser) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  const isNicknameChanged = currentUser.nickname !== parsed.data.nickname;
  if (isNicknameChanged && currentUser.nicknameUpdatedAt) {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const elapsedMs = Date.now() - currentUser.nicknameUpdatedAt.getTime();
    if (elapsedMs < THIRTY_DAYS_MS) {
      const remainingDays = Math.ceil((THIRTY_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000));
      throw new ServiceError(
        `닉네임은 30일에 한 번만 변경할 수 있습니다. ${remainingDays}일 후 다시 시도해 주세요.`,
        "NICKNAME_CHANGE_RATE_LIMITED",
        429,
      );
    }
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
      nicknameUpdatedAt: isNicknameChanged ? new Date() : undefined,
      bio:
        parsed.data.bio && parsed.data.bio.trim().length > 0
          ? parsed.data.bio.trim()
          : null,
      showPublicPosts: parsed.data.showPublicPosts ?? currentUser.showPublicPosts,
      showPublicComments: parsed.data.showPublicComments ?? currentUser.showPublicComments,
      showPublicPets: parsed.data.showPublicPets ?? currentUser.showPublicPets,
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
    city: normalizeNeighborhoodCity(trimmedCity),
    district: normalizeNeighborhoodDistrict(trimmedDistrict),
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

  const cityVariants = getNeighborhoodCityVariants(region.city);
  const existingByRegion = await prisma.neighborhood.findFirst({
    where: {
      city: { in: cityVariants },
      district: region.district,
    },
    select: { id: true },
  });

  if (existingByRegion) {
    return existingByRegion.id;
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
  if (normalizedNeighborhoodIds.length === 0) {
    return prisma.userNeighborhood.deleteMany({
      where: { userId },
    });
  }

  if (!parsed.data.primaryNeighborhoodId) {
    throw new ServiceError("대표 동네를 선택해 주세요.", "INVALID_INPUT", 400);
  }

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

  const canonicalImageUrl = getUploadProxyPath(parsed.data.imageUrl) ?? parsed.data.imageUrl.trim();

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, image: true },
  });
  if (!existing) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { image: canonicalImageUrl },
    select: { id: true, image: true },
  });

  await attachUploadUrls([canonicalImageUrl]);
  if (existing.image && existing.image !== canonicalImageUrl) {
    void releaseUploadUrlsIfUnreferenced([existing.image]).catch(() => undefined);
  }

  return updated;
}

type UpdatePreferredPetTypesParams = {
  userId: string;
  input: unknown;
};

export async function updatePreferredPetTypes({ userId, input }: UpdatePreferredPetTypesParams) {
  const parsed = preferredPetTypesSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("관심 동물 선택이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const { petTypeIds } = parsed.data;
  if (petTypeIds.length > 0) {
    const existingCount = await prisma.community.count({
      where: {
        id: { in: petTypeIds },
        isActive: true,
      },
    });
    if (existingCount !== petTypeIds.length) {
      throw new ServiceError("일부 동물 타입을 찾을 수 없습니다.", "COMMUNITY_NOT_FOUND", 404);
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.userPetTypePreference.deleteMany({ where: { userId } });

    if (petTypeIds.length === 0) {
      return [];
    }

    await tx.userPetTypePreference.createMany({
      data: petTypeIds.map((petTypeId) => ({
        userId,
        petTypeId,
      })),
      skipDuplicates: true,
    });

    return tx.userPetTypePreference.findMany({
      where: { userId },
      select: { petTypeId: true },
      orderBy: { createdAt: "asc" },
    });
  });
}
