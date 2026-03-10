import { Prisma, UserRole } from "@prisma/client";

import { normalizeAuthEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

let userPreferredPetTypesSupport: boolean | null = null;

function supportsUserPreferredPetTypes() {
  if (userPreferredPetTypesSupport !== null) {
    return userPreferredPetTypesSupport;
  }

  userPreferredPetTypesSupport = true;
  return true;
}

function isUnknownPreferredPetTypesFieldError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Unknown field `preferredPetTypes`")
  );
}

function isMissingUserPetTypePreferenceTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const tableName = String(error.meta?.table ?? "");
    return tableName.includes("UserPetTypePreference");
  }

  return (
    error instanceof Error &&
    error.message.includes("UserPetTypePreference") &&
    error.message.includes("does not exist")
  );
}

function isUnavailablePreferredPetTypesError(error: unknown) {
  return (
    isUnknownPreferredPetTypesFieldError(error) ||
    isMissingUserPetTypePreferenceTableError(error)
  );
}

const USER_BASE_SELECT = {
  id: true,
  email: true,
  nickname: true,
  bio: true,
  image: true,
  role: true,
} as const;

const petListCache = new Map<
  string,
  {
    expiresAt: number;
    pets: Array<Record<string, unknown>>;
  }
>();

type UserRoleSummary = {
  id: string;
  role: UserRole;
};

function buildInsensitiveEmailWhere(email: string) {
  return {
    email: {
      equals: normalizeAuthEmail(email),
      mode: Prisma.QueryMode.insensitive,
    },
  } as const;
}

export async function getUserRoleByEmail(email: string): Promise<UserRoleSummary | null> {
  return prisma.user.findFirst({
    where: buildInsensitiveEmailWhere(email),
    select: { id: true, role: true },
  });
}

export async function getUserRoleById(id: string): Promise<UserRoleSummary | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
}

export async function getUserByEmail(email: string) {
  if (!supportsUserPreferredPetTypes()) {
    return prisma.user.findFirst({
      where: buildInsensitiveEmailWhere(email),
      select: USER_BASE_SELECT,
    });
  }

  return prisma.user
    .findFirst({
      where: buildInsensitiveEmailWhere(email),
      select: {
        ...USER_BASE_SELECT,
        preferredPetTypes: {
          select: { petTypeId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    .catch((error) => {
      if (!isUnavailablePreferredPetTypesError(error)) {
        throw error;
      }
      userPreferredPetTypesSupport = false;
      return prisma.user.findFirst({
        where: buildInsensitiveEmailWhere(email),
        select: USER_BASE_SELECT,
      });
    });
}

export async function findUserByEmailInsensitive<TSelect extends Prisma.UserSelect>(
  email: string,
  select: TSelect,
) {
  return prisma.user.findFirst({
    where: buildInsensitiveEmailWhere(email),
    select,
  }) as Promise<Prisma.UserGetPayload<{ select: TSelect }> | null>;
}

export async function getUserById(id: string) {
  if (!supportsUserPreferredPetTypes()) {
    return prisma.user.findUnique({
      where: { id },
      select: USER_BASE_SELECT,
    });
  }

  return prisma.user
    .findUnique({
      where: { id },
      select: {
        ...USER_BASE_SELECT,
        preferredPetTypes: {
          select: { petTypeId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    .catch((error) => {
      if (!isUnavailablePreferredPetTypesError(error)) {
        throw error;
      }
      userPreferredPetTypesSupport = false;
      return prisma.user.findUnique({
        where: { id },
        select: USER_BASE_SELECT,
      });
    });
}

export async function getUserPasswordStatusById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      passwordHash: true,
      accounts: {
        select: { provider: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    hasPassword: Boolean(user.passwordHash),
    linkedAccountProviders: [...new Set(user.accounts.map((account) => account.provider))],
  } as const;
}

export async function getUserWithNeighborhoods(id: string) {
  const baseSelect = {
    id: true,
    email: true,
    nickname: true,
    nicknameUpdatedAt: true,
    bio: true,
    image: true,
    createdAt: true,
    showPublicPosts: true,
    showPublicComments: true,
    showPublicPets: true,
    neighborhoods: {
      select: {
        id: true,
        isPrimary: true,
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
      },
    },
  } as const;

  if (!supportsUserPreferredPetTypes()) {
    return prisma.user.findUnique({
      where: { id },
      select: baseSelect,
    });
  }

  return prisma.user
    .findUnique({
      where: { id },
      select: {
        ...baseSelect,
        preferredPetTypes: {
          select: {
            petTypeId: true,
            petType: {
              select: {
                id: true,
                labelKo: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    .catch((error) => {
      if (!isUnavailablePreferredPetTypesError(error)) {
        throw error;
      }
      userPreferredPetTypesSupport = false;
      return prisma.user.findUnique({
        where: { id },
        select: baseSelect,
      });
    });
}

export async function listPreferredPetTypeIdsByUserId(userId: string) {
  if (!supportsUserPreferredPetTypes()) {
    return [];
  }

  const items = await prisma.userPetTypePreference
    .findMany({
      where: { userId },
      select: { petTypeId: true },
      orderBy: { createdAt: "asc" },
    })
    .catch((error) => {
      if (!isUnavailablePreferredPetTypesError(error)) {
        throw error;
      }
      userPreferredPetTypesSupport = false;
      return [];
    });
  return items.map((item) => item.petTypeId);
}

export async function listUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, nickname: true },
  });
}

export async function getPublicUserProfileById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nickname: true,
      bio: true,
      image: true,
      createdAt: true,
      showPublicPosts: true,
      showPublicComments: true,
      showPublicPets: true,
    },
  });

  if (!user) {
    return null;
  }

  const [postCount, commentCount, reactionCount] = await Promise.all([
    user.showPublicPosts
      ? prisma.post.count({
          where: {
            authorId: id,
            status: "ACTIVE",
          },
        })
      : Promise.resolve(null),
    user.showPublicComments
      ? prisma.comment.count({
          where: {
            authorId: id,
            status: "ACTIVE",
          },
        })
      : Promise.resolve(null),
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
  page?: number;
};

type CursorPageResult<T> = {
  items: T[];
  nextCursor: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
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
  page = 1,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const where = {
    authorId: userId,
    status: "ACTIVE" as const,
    scope: "GLOBAL" as const,
  };
  const totalCount = await prisma.post.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const resolvedPage = Math.min(safePage, totalPages);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: cursorValue ? safeLimit + 1 : safeLimit,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : resolvedPage > 1
          ? {
              skip: (resolvedPage - 1) * safeLimit,
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
    page: resolvedPage,
    totalPages,
    totalCount,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPublicUserComments({
  userId,
  limit = 20,
  cursor,
  page = 1,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const where = {
    authorId: userId,
    status: "ACTIVE" as const,
    post: {
      status: "ACTIVE" as const,
      scope: "GLOBAL" as const,
    },
  };
  const totalCount = await prisma.comment.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const resolvedPage = Math.min(safePage, totalPages);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: cursorValue ? safeLimit + 1 : safeLimit,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : resolvedPage > 1
          ? {
              skip: (resolvedPage - 1) * safeLimit,
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
    page: resolvedPage,
    totalPages,
    totalCount,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPublicUserReactions({
  userId,
  limit = 20,
  cursor,
  page = 1,
}: PublicUserActivityOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const where = {
    userId,
    post: {
      status: "ACTIVE" as const,
      scope: "GLOBAL" as const,
    },
  };
  const totalCount = await prisma.postReaction.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const resolvedPage = Math.min(safePage, totalPages);
  const items = await runWithCursorFallback(cursor, (cursorValue) =>
    prisma.postReaction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: cursorValue ? safeLimit + 1 : safeLimit,
      ...(cursorValue
        ? {
            cursor: { id: cursorValue },
            skip: 1,
          }
        : resolvedPage > 1
          ? {
              skip: (resolvedPage - 1) * safeLimit,
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
    page: resolvedPage,
    totalPages,
    totalCount,
  } satisfies CursorPageResult<(typeof items)[number]>;
}

export async function listPetsByUserId(
  userId: string,
  options?: {
    limit?: number;
    cacheTtlMs?: number;
  },
) {
  type PetSpeciesValue =
    | "DOG"
    | "CAT"
    | "BIRD"
    | "REPTILE"
    | "SMALL_PET"
    | "AQUATIC"
    | "AMPHIBIAN"
    | "ARTHROPOD"
    | "SPECIAL_OTHER";
  type PetSizeClassValue = "TOY" | "SMALL" | "MEDIUM" | "LARGE" | "GIANT" | "UNKNOWN";
  type PetLifeStageValue = "PUPPY_KITTEN" | "YOUNG" | "ADULT" | "SENIOR" | "UNKNOWN";

  type PetListItem = {
    id: string;
    name: string;
    species: PetSpeciesValue;
    breedCode: string | null;
    breedLabel: string | null;
    sizeClass: PetSizeClassValue;
    lifeStage: PetLifeStageValue;
    age: number | null;
    weightKg: number | null;
    birthYear: number | null;
    imageUrl: string | null;
    bio: string | null;
    createdAt: Date;
  };

  type SelectShape = Record<string, boolean>;

  const petDelegate = (prisma as unknown as {
    pet: {
      findMany: (args: {
        where: { userId: string };
        orderBy: Array<{ createdAt: "desc" }>;
        select: SelectShape;
        take?: number;
      }) => Promise<Array<Record<string, unknown>>>;
    };
  }).pet;

  const safeLimit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const cacheTtlMs = Math.max(options?.cacheTtlMs ?? 0, 0);
  const cacheKey = `${userId}:${safeLimit}`;

  const requiredSelect: SelectShape = {
    id: true,
    name: true,
    species: true,
    age: true,
    imageUrl: true,
    bio: true,
    createdAt: true,
  };
  const optionalKeys = new Set([
    "breedCode",
    "breedLabel",
    "sizeClass",
    "lifeStage",
    "weightKg",
    "birthYear",
  ]);
  const currentSelect: SelectShape = {
    ...requiredSelect,
    breedCode: true,
    breedLabel: true,
    sizeClass: true,
    lifeStage: true,
    weightKg: true,
    birthYear: true,
  };

  const toPetListItem = (pet: Record<string, unknown>): PetListItem => ({
    id: typeof pet.id === "string" ? pet.id : "",
    name: typeof pet.name === "string" ? pet.name : "",
    species:
      pet.species === "CAT" ||
      pet.species === "BIRD" ||
      pet.species === "REPTILE" ||
      pet.species === "SMALL_PET" ||
      pet.species === "AQUATIC" ||
      pet.species === "AMPHIBIAN" ||
      pet.species === "ARTHROPOD" ||
      pet.species === "SPECIAL_OTHER"
        ? pet.species
        : "DOG",
    breedCode: typeof pet.breedCode === "string" ? pet.breedCode : null,
    breedLabel: typeof pet.breedLabel === "string" ? pet.breedLabel : null,
    sizeClass:
      pet.sizeClass === "TOY" ||
      pet.sizeClass === "SMALL" ||
      pet.sizeClass === "MEDIUM" ||
      pet.sizeClass === "LARGE" ||
      pet.sizeClass === "GIANT"
        ? pet.sizeClass
        : "UNKNOWN",
    lifeStage:
      pet.lifeStage === "PUPPY_KITTEN" ||
      pet.lifeStage === "YOUNG" ||
      pet.lifeStage === "ADULT" ||
      pet.lifeStage === "SENIOR"
        ? pet.lifeStage
        : "UNKNOWN",
    age: typeof pet.age === "number" ? pet.age : null,
    weightKg: typeof pet.weightKg === "number" ? pet.weightKg : null,
    birthYear: typeof pet.birthYear === "number" ? pet.birthYear : null,
    imageUrl: typeof pet.imageUrl === "string" ? pet.imageUrl : null,
    bio: typeof pet.bio === "string" ? pet.bio : null,
    createdAt: pet.createdAt instanceof Date ? pet.createdAt : new Date(0),
  });

  if (cacheTtlMs > 0) {
    const cached = petListCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.pets.map(toPetListItem);
    }
  }

  while (true) {
    try {
      const pets = await petDelegate.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }],
        select: currentSelect,
        take: safeLimit,
      });

      if (cacheTtlMs > 0) {
        petListCache.set(cacheKey, {
          expiresAt: Date.now() + cacheTtlMs,
          pets,
        });
      }

      return pets.map(toPetListItem);
    } catch (error) {
      const isMissingColumnError =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
      if (!isMissingColumnError) {
        throw error;
      }

      const missingColumn = String(error.meta?.column ?? "");
      const match = /Pet\.(\w+)/.exec(missingColumn);
      const missingField = match?.[1];
      if (!missingField || !optionalKeys.has(missingField) || !(missingField in currentSelect)) {
        throw error;
      }

      delete currentSelect[missingField];
    }
  }
}
