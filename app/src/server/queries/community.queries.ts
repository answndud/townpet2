import { CommonBoardType, PostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

export async function listCommunities({
  cursor,
  limit,
  category,
  q,
}: ListCommunitiesOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQ = q?.trim();

  const items = await prisma.community
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
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { labelKo: "asc" }],
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

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { items, nextCursor };
}

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
        status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
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
            name: true,
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
