import { PostScope, PostStatus, PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const NO_VIEWER_ID = "__NO_VIEWER__";

const buildPostListInclude = (viewerId?: string) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
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
  }) as const;

const buildPostDetailInclude = (viewerId?: string) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
        treatmentType: true,
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
  }) as const;

type PostListOptions = {
  cursor?: string;
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  neighborhoodId?: string;
  viewerId?: string;
};

type BestPostListOptions = {
  limit: number;
  days: number;
  type?: PostType;
  scope: PostScope;
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

export async function getPostById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }

  return prisma.post.findUnique({
    where: { id },
    include: buildPostDetailInclude(viewerId),
  });
}

export async function listPosts({
  cursor,
  limit,
  type,
  scope,
  q,
  neighborhoodId,
  viewerId,
}: PostListOptions) {
  const items = await prisma.post.findMany({
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type ? { type } : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: { createdAt: "desc" },
    include: buildPostListInclude(viewerId),
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { items, nextCursor };
}

export async function listBestPosts({
  limit,
  days,
  type,
  scope,
  neighborhoodId,
  minLikes = 1,
  viewerId,
}: BestPostListOptions) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return prisma.post.findMany({
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type ? { type } : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      likeCount: { gte: minLikes },
      createdAt: { gte: since },
    },
    take: limit,
    orderBy: [
      { likeCount: "desc" },
      { commentCount: "desc" },
      { viewCount: "desc" },
      { createdAt: "desc" },
    ],
    include: buildPostListInclude(viewerId),
  });
}

type UserPostListOptions = {
  authorId: string;
  scope?: PostScope;
  type?: PostType;
  q?: string;
};

export async function listUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.findMany({
    where: {
      authorId,
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(scope ? { scope } : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: { hospitalName: true, rating: true },
      },
      placeReview: {
        select: { placeName: true, rating: true, isPetAllowed: true },
      },
      walkRoute: {
        select: { routeName: true, distance: true },
      },
    },
  });
}
