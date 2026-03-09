import { CommonBoardType, PostStatus, PostType, Prisma } from "@prisma/client";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { createStaticQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";

type ListCommunitiesOptions = {
  cursor?: string;
  limit: number;
  category?: string;
  q?: string;
};

type ListCommonBoardPostsOptions = {
  cursor?: string;
  limit: number;
  commonBoardType: CommonBoardType;
  animalTag?: string;
  q?: string;
};

type CommunityNavItem = {
  id: string;
  slug: string;
  labelKo: string;
  tags?: string[];
};

export type AdoptionBoardPostItem = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  author: {
    id: string;
    nickname: string | null;
  };
  images: Array<{
    id: string;
    url: string;
    order: number;
  }>;
  adoptionListing: {
    shelterName: string | null;
    region: string | null;
    animalType: string | null;
    breed: string | null;
    ageLabel: string | null;
    sex: string | null;
    sizeLabel: string | null;
    status: string | null;
    isNeutered: boolean | null;
    isVaccinated: boolean | null;
  } | null;
};

type AdoptionBoardWhereOptions = {
  q?: string;
};

function isMissingCommunitySchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021") {
    return false;
  }

  const meta = error.meta as { table?: unknown } | undefined;
  const tableName = typeof meta?.table === "string" ? meta.table : "";
  return tableName.includes("Community") || tableName.includes("CommunityCategory");
}

function isMissingCommonBoardPostColumnError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2022") {
    return false;
  }

  const meta = error.meta as { column?: unknown } | undefined;
  const columnName = typeof meta?.column === "string" ? meta.column : "";
  return (
    columnName.includes("Post.boardScope") ||
    columnName.includes("Post.commonBoardType") ||
    columnName.includes("Post.animalTags")
  );
}

function isMissingAdoptionBoardSchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021" && error.code !== "P2022") {
    return false;
  }

  const tableName = String(error.meta?.table ?? "");
  const columnName = String(error.meta?.column ?? "");

  return (
    tableName.includes("AdoptionListing") ||
    tableName.includes("PostImage") ||
    columnName.includes("AdoptionListing") ||
    columnName.includes("PostImage")
  );
}

function buildAdoptionBoardWhere({ q }: AdoptionBoardWhereOptions): Prisma.PostWhereInput {
  const trimmedQ = q?.trim();

  return {
    status: PostStatus.ACTIVE,
    boardScope: "COMMON",
    commonBoardType: CommonBoardType.ADOPTION,
    type: PostType.ADOPTION_LISTING,
    ...(trimmedQ
      ? {
          OR: [
            { title: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive } },
            { content: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive } },
            {
              adoptionListing: {
                is: {
                  shelterName: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
            {
              adoptionListing: {
                is: {
                  region: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
            {
              adoptionListing: {
                is: {
                  animalType: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
            {
              adoptionListing: {
                is: {
                  breed: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
            {
              adoptionListing: {
                is: {
                  ageLabel: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function listCommunities({
  cursor,
  limit,
  category,
  q,
}: ListCommunitiesOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQ = q?.trim();

  const runListCommunities = async () =>
    prisma.community
      .findMany({
        where: {
          isActive: true,
          category: {
            isActive: true,
            ...(category ? { slug: category } : {}),
          },
          ...(trimmedQ
            ? {
                OR: [
                  { labelKo: { contains: trimmedQ, mode: "insensitive" } },
                  { description: { contains: trimmedQ, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          labelKo: true,
          description: true,
          sortOrder: true,
          tags: true,
          defaultPostTypes: true,
          category: {
            select: {
              slug: true,
              labelKo: true,
              sortOrder: true,
            },
          },
        },
        orderBy: [
          { category: { sortOrder: "asc" } },
          { sortOrder: "asc" },
          { labelKo: "asc" },
        ],
        take: safeLimit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      })
      .catch((error) => {
        if (isMissingCommunitySchemaError(error)) {
          return [];
        }

        throw error;
      });

  const shouldCache = !cursor;
  const items = shouldCache
    ? await withQueryCache({
        key: createStaticQueryCacheKey("communities", {
          limit: safeLimit,
          category: category ?? "",
          q: trimmedQ ?? "",
        }),
        ttlSeconds: 120,
        fetcher: runListCommunities,
      })
    : await runListCommunities();

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { items, nextCursor };
}

export const listCommunityNavItems = cache(
  async (limit = 50): Promise<CommunityNavItem[]> => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const runListCommunityNavItems = async () =>
      prisma.community
        .findMany({
          where: {
            isActive: true,
            category: {
              isActive: true,
            },
          },
          select: {
            id: true,
            slug: true,
            labelKo: true,
            tags: true,
          },
          orderBy: [
            { category: { sortOrder: "asc" } },
            { sortOrder: "asc" },
            { labelKo: "asc" },
          ],
          take: safeLimit,
        })
        .catch((error) => {
          if (isMissingCommunitySchemaError(error)) {
            return [];
          }

          throw error;
        });

    return withQueryCache({
      key: createStaticQueryCacheKey("communities-nav", { limit: safeLimit }),
      ttlSeconds: 300,
      fetcher: runListCommunityNavItems,
    });
  },
);

export async function listCommonBoardPosts({
  cursor,
  limit,
  commonBoardType,
  animalTag,
  q,
}: ListCommonBoardPostsOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedTag = animalTag?.trim();
  const trimmedQ = q?.trim();

  const items = await prisma.post
    .findMany({
      where: {
        status: PostStatus.ACTIVE,
        boardScope: "COMMON",
        commonBoardType,
        ...(trimmedTag ? { animalTags: { has: trimmedTag } } : {}),
        ...(trimmedQ
          ? {
              OR: [
                { title: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive } },
                { content: { contains: trimmedQ, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        scope: true,
        commonBoardType: true,
        animalTags: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
        neighborhood: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
          },
        },
        adoptionListing: {
          select: {
            shelterName: true,
            region: true,
            animalType: true,
            status: true,
          },
        },
        volunteerRecruitment: {
          select: {
            shelterName: true,
            region: true,
            volunteerDate: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: safeLimit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    })
    .catch((error) => {
      if (isMissingCommonBoardPostColumnError(error)) {
        return [];
      }

      throw error;
    });

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { items, nextCursor };
}

export async function countAdoptionBoardPosts({ q }: { q?: string }) {
  return prisma.post
    .count({
      where: buildAdoptionBoardWhere({ q }),
    })
    .catch((error) => {
      if (isMissingCommonBoardPostColumnError(error) || isMissingAdoptionBoardSchemaError(error)) {
        return 0;
      }

      throw error;
    });
}

export async function listAdoptionBoardPostsPage({
  page,
  limit,
  q,
}: {
  page: number;
  limit: number;
  q?: string;
}) {
  const safeLimit = Math.min(Math.max(limit, 1), 48);
  const safePage = Math.max(page, 1);

  return prisma.post
    .findMany({
      where: buildAdoptionBoardWhere({ q }),
      orderBy: [{ createdAt: "desc" }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        commentCount: true,
        likeCount: true,
        viewCount: true,
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
        adoptionListing: {
          select: {
            shelterName: true,
            region: true,
            animalType: true,
            breed: true,
            ageLabel: true,
            sex: true,
            sizeLabel: true,
            status: true,
            isNeutered: true,
            isVaccinated: true,
          },
        },
      },
    })
    .catch((error): AdoptionBoardPostItem[] | Promise<never> => {
      if (isMissingCommonBoardPostColumnError(error) || isMissingAdoptionBoardSchemaError(error)) {
        return [];
      }

      throw error;
    });
}
