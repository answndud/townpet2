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
    const reviewInput = hospitalReviewSchema.safeParse(rawInput.hospitalReview);
    if (!reviewInput.success) {
      throw new ServiceError("병원 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const visitDate = new Date(reviewInput.data.visitDate);
    if (Number.isNaN(visitDate.getTime())) {
      throw new ServiceError("방문 날짜가 올바르지 않습니다.", "INVALID_DATE", 400);
    }

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        hospitalReview: {
          create: {
            ...reviewInput.data,
            visitDate,
          },
        },
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
    const reviewInput = placeReviewSchema.safeParse(rawInput.placeReview);
    if (!reviewInput.success) {
      throw new ServiceError("장소 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        placeReview: {
          create: {
            ...reviewInput.data,
          },
        },
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
    const routeInput = walkRouteSchema.safeParse(rawInput.walkRoute);
    if (!routeInput.success) {
      throw new ServiceError("산책로 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    return prisma.post.create({
      data: {
        ...parsed.data,
        authorId,
        walkRoute: {
          create: {
            ...routeInput.data,
            coordinates: [],
          },
        },
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
  input: unknown;
};

export async function updatePost({ postId, input }: UpdatePostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  if (parsed.data.scope === PostScope.LOCAL && !parsed.data.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
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
};

export async function deletePost({ postId }: DeletePostParams) {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  return prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.DELETED },
    select: { id: true, status: true },
  });
}
