import { PostScope, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  hospitalReviewSchema,
  placeReviewSchema,
  postCreateSchema,
  postUpdateSchema,
  walkRouteSchema,
} from "@/lib/validations/post";
import { ServiceError } from "@/server/services/service-error";

type CreatePostParams = {
  authorId: string;
  input: unknown;
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const hasAnyValue = (data: Record<string, unknown>) =>
  Object.values(data).some((value) => hasValue(value));

export async function createPost({ authorId, input }: CreatePostParams) {
  const parsed = postCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const rawInput = input as Record<string, unknown>;

  if (parsed.data.scope === PostScope.LOCAL && !parsed.data.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  if (parsed.data.type === "HOSPITAL_REVIEW") {
    const reviewInput = hospitalReviewSchema.safeParse(rawInput.hospitalReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("병원 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(reviewInput.data);

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        ...(shouldCreateReview
          ? {
              hospitalReview: {
                create: {
                  ...reviewInput.data,
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
      },
    });
  }

  if (parsed.data.type === "PLACE_REVIEW") {
    const reviewInput = placeReviewSchema.safeParse(rawInput.placeReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("장소 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(reviewInput.data);

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        ...(shouldCreateReview
          ? {
              placeReview: {
                create: {
                  ...reviewInput.data,
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        placeReview: {
          select: {
            placeName: true,
            placeType: true,
            address: true,
            isPetAllowed: true,
            rating: true,
          },
        },
      },
    });
  }

  if (parsed.data.type === "WALK_ROUTE") {
    const routeInput = walkRouteSchema.safeParse(rawInput.walkRoute ?? {});
    if (!routeInput.success) {
      throw new ServiceError("산책로 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(routeInput.data);

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        ...(shouldCreateReview
          ? {
              walkRoute: {
                create: {
                  ...routeInput.data,
                  coordinates: [],
                  safetyTags: routeInput.data.safetyTags ?? [],
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        placeReview: {
          select: {
            placeName: true,
            placeType: true,
            address: true,
            isPetAllowed: true,
            rating: true,
          },
        },
        walkRoute: {
          select: {
            routeName: true,
            distance: true,
            duration: true,
            difficulty: true,
            hasStreetLights: true,
            hasRestroom: true,
            hasParkingLot: true,
            safetyTags: true,
          },
        },
      },
    });
  }

  return prisma.post.create({
    data: {
      ...parsed.data,
      authorId,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
          rating: true,
        },
      },
      placeReview: {
        select: {
          placeName: true,
          placeType: true,
          address: true,
          isPetAllowed: true,
          rating: true,
        },
      },
      walkRoute: {
        select: {
          routeName: true,
          distance: true,
          duration: true,
          difficulty: true,
          hasStreetLights: true,
          hasRestroom: true,
          hasParkingLot: true,
          safetyTags: true,
        },
      },
    },
  });
}

type UpdatePostParams = {
  postId: string;
  authorId: string;
  input: unknown;
};

export async function updatePost({ postId, authorId, input }: UpdatePostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  if (parsed.data.scope === PostScope.LOCAL && !parsed.data.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.post.update({
    where: { id: postId },
    data: {
      ...parsed.data,
      neighborhoodId:
        parsed.data.scope === PostScope.GLOBAL ? null : parsed.data.neighborhoodId,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
          rating: true,
        },
      },
    },
  });
}

type DeletePostParams = {
  postId: string;
  authorId: string;
};

export async function deletePost({ postId, authorId }: DeletePostParams) {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.DELETED },
    select: { id: true, status: true },
  });
}
