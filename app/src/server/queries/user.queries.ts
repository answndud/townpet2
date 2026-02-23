import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      bio: true,
      image: true,
      role: true,
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      bio: true,
      image: true,
      role: true,
    },
  });
}

export async function getUserWithNeighborhoods(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      bio: true,
      image: true,
      createdAt: true,
      neighborhoods: {
        select: {
          id: true,
          isPrimary: true,
          neighborhood: {
            select: { id: true, name: true, city: true, district: true },
          },
        },
      },
    },
  });
}

export async function listUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true, nickname: true },
  });
}

export async function getPublicUserProfileById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nickname: true,
      bio: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const [postCount, commentCount, reactionCount] = await Promise.all([
    prisma.post.count({
      where: {
        authorId: id,
        status: "ACTIVE",
      },
    }),
    prisma.comment.count({
      where: {
        authorId: id,
        status: "ACTIVE",
      },
    }),
    prisma.postReaction.count({
      where: {
        userId: id,
        post: {
          status: "ACTIVE",
        },
      },
    }),
  ]);

  return {
    ...user,
    postCount,
    commentCount,
    reactionCount,
  };
}

type PublicUserActivityOptions = {
  userId: string;
  limit?: number;
  cursor?: string;
};

type CursorPageResult<T> = {
  items: T[];
  nextCursor: string | null;
};

function isCursorNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

async function runWithCursorFallback<T>(
  cursor: string | undefined,
  fetchWithCursor: (cursorValue?: string) => Promise<T>,
) {
  if (!cursor) {
    return fetchWithCursor(undefined);
  }

  try {
    return await fetchWithCursor(cursor);
  } catch (error) {
    if (!isCursorNotFoundError(error)) {
      throw error;
    }
    return fetchWithCursor(undefined);
  }
}

export async function listPublicUserPosts({
  userId,
  limit = 20,
  cursor,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.post.findMany({
      where: {
        authorId: userId,
        status: "ACTIVE",
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: safeLimit + 1,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        scope: true,
        commentCount: true,
        likeCount: true,
        createdAt: true,
      },
    }),
  );

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const next = items.pop();
    nextCursor = next?.id ?? null;
  }

  return {
    items,
    nextCursor,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPublicUserComments({
  userId,
  limit = 20,
  cursor,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.comment.findMany({
      where: {
        authorId: userId,
        status: "ACTIVE",
        post: {
          status: "ACTIVE",
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: safeLimit + 1,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        content: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
  );

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const next = items.pop();
    nextCursor = next?.id ?? null;
  }

  return {
    items,
    nextCursor,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPublicUserReactions({
  userId,
  limit = 20,
  cursor,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.postReaction.findMany({
      where: {
        userId,
        post: {
          status: "ACTIVE",
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: safeLimit + 1,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        type: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                nickname: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  );

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const next = items.pop();
    nextCursor = next?.id ?? null;
  }

  return {
    items,
    nextCursor,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPetsByUserId(userId: string) {
  const petDelegate = (prisma as unknown as {
    pet: {
      findMany: (args: {
        where: { userId: string };
        orderBy: Array<{ createdAt: "desc" }>;
        select: Record<string, boolean>;
      }) => Promise<Array<Record<string, unknown>>>;
    };
  }).pet;

  try {
    return await petDelegate.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        species: true,
        breedCode: true,
        breedLabel: true,
        sizeClass: true,
        lifeStage: true,
        age: true,
        imageUrl: true,
        bio: true,
        createdAt: true,
      },
    });
  } catch (error) {
    const isMissingBreedCodeColumn =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2022" &&
      String(error.meta?.column ?? "").includes("Pet.breedCode");

    if (!isMissingBreedCodeColumn) {
      throw error;
    }

    const legacyPets = await petDelegate.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        species: true,
        breedLabel: true,
        sizeClass: true,
        lifeStage: true,
        age: true,
        imageUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    return legacyPets.map((pet) => ({
      ...pet,
      breedCode: null,
    }));
  }
}
