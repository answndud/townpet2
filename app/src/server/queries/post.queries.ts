import {
  PostReactionType,
  PostScope,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import {
  expandExcludedPostTypes,
  getEquivalentPostTypes,
} from "@/lib/post-type-groups";
import { logger, serializeError } from "@/server/logger";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";
export type PostListSort = "LATEST" | "LIKE" | "COMMENT";
export type PostSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
const DEFAULT_POST_LIST_SORT: PostListSort = "LATEST";
const DEFAULT_POST_SEARCH_IN: PostSearchIn = "ALL";
const SEARCH_SIMILARITY_THRESHOLD = 0.12;
let postReactionsFieldSupport: boolean | null = null;
let postGuestAuthorFieldSupport: boolean | null = null;
let pgTrgmSupport: boolean | null = null;
let pgTrgmSupportWarned = false;

async function supportsPgTrgm() {
  if (pgTrgmSupport !== null) {
    return pgTrgmSupport;
  }

  try {
    const result = await prisma.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`
      SELECT EXISTS(
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
      ) AS enabled
    `);
    pgTrgmSupport = Boolean(result[0]?.enabled);
  } catch (error) {
    pgTrgmSupport = false;
    if (!pgTrgmSupportWarned) {
      pgTrgmSupportWarned = true;
      logger.warn("pg_trgm 확장 지원 여부 확인에 실패해 trigram 검색을 비활성화합니다.", {
        error: serializeError(error),
      });
    }
  }

  if (!pgTrgmSupport && !pgTrgmSupportWarned) {
    pgTrgmSupportWarned = true;
    logger.warn(
      "pg_trgm 확장이 설치되지 않아 trigram 유사도 검색을 비활성화합니다. 마이그레이션으로 확장을 적용해 주세요.",
    );
  }

  return pgTrgmSupport;
}

const buildPostListInclude = (
  viewerId?: string,
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    community: {
      select: {
        id: true,
        labelKo: true,
        category: {
          select: {
            labelKo: true,
          },
        },
      },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
    images: {
      select: { id: true },
    },
  }) as const;

const buildPostListIncludeWithoutReactions = (
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    community: {
      select: {
        id: true,
        labelKo: true,
        category: {
          select: {
            labelKo: true,
          },
        },
      },
    },
    images: {
      select: { id: true },
    },
  }) as const;

const buildPostDetailInclude = (
  viewerId?: string,
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
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
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

const buildPostDetailIncludeWithoutReactions = (
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
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
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

const LEGACY_POST_BASE_SELECT = {
  id: true,
  authorId: true,
  neighborhoodId: true,
  type: true,
  scope: true,
  status: true,
  title: true,
  content: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LEGACY_POST_RELATION_SELECT = {
  author: { select: { id: true, name: true, nickname: true, image: true } },
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
  images: {
    select: { id: true, url: true, order: true },
    orderBy: { order: "asc" },
  },
} as const;

const buildLegacyPostListSelect = (viewerId?: string) =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    images: {
      select: { id: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
  }) as const;

const buildLegacyPostListSelectWithoutReactions = () =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    images: {
      select: { id: true },
    },
  }) as const;

const buildLegacyPostDetailSelect = (viewerId?: string) =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    ...LEGACY_POST_RELATION_SELECT,
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
        treatmentType: true,
      },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
  }) as const;

const buildLegacyPostDetailSelectWithoutReactions = () =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    ...LEGACY_POST_RELATION_SELECT,
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
        treatmentType: true,
      },
    },
  }) as const;

function isUnknownReactionsIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `reactions`");
}

function isUnknownGuestAuthorIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `guestAuthor`");
}

function isUnknownGuestPostColumnError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("guestDisplayName") ||
    message.includes("guestIpDisplay") ||
    message.includes("guestIpLabel") ||
    message.includes("guestPasswordHash") ||
    message.includes("guestIpHash") ||
    message.includes("guestFingerprintHash") ||
    message.includes("P2022")
  );
}

type GuestMetaFields = {
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  guestPasswordHash?: string | null;
  guestIpHash?: string | null;
  guestFingerprintHash?: string | null;
};

function withEmptyGuestPostMetaOne<T extends object>(item: T | null): (T & GuestMetaFields) | null {
  if (!item) {
    return null;
  }
  return {
    ...item,
    guestDisplayName: null,
    guestIpDisplay: null,
    guestIpLabel: null,
    guestPasswordHash: null,
    guestIpHash: null,
    guestFingerprintHash: null,
  };
}

function withEmptyGuestPostMeta<T extends object>(items: T[]): Array<T & GuestMetaFields> {
  return items.map((item) => ({
    ...item,
    guestDisplayName: null,
    guestIpDisplay: null,
    guestIpLabel: null,
    guestPasswordHash: null,
    guestIpHash: null,
    guestFingerprintHash: null,
  }));
}

function supportsPostReactionsField() {
  if (postReactionsFieldSupport !== null) {
    return postReactionsFieldSupport;
  }

  const runtimeModels = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel?.models;

  const postFields = runtimeModels?.Post?.fields;
  if (!postFields || postFields.length === 0) {
    // If runtime metadata is unavailable, keep current behavior and fall back via catch.
    postReactionsFieldSupport = true;
    return true;
  }

  postReactionsFieldSupport = postFields.some((field) => field.name === "reactions");
  return postReactionsFieldSupport;
}

function supportsPostGuestAuthorField() {
  if (postGuestAuthorFieldSupport !== null) {
    return postGuestAuthorFieldSupport;
  }

  const runtimeModels = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel?.models;

  const postFields = runtimeModels?.Post?.fields;
  if (!postFields || postFields.length === 0) {
    postGuestAuthorFieldSupport = true;
    return true;
  }

  postGuestAuthorFieldSupport = postFields.some((field) => field.name === "guestAuthor");
  return postGuestAuthorFieldSupport;
}

function withEmptyReactions<T extends Record<string, unknown>>(items: T[]) {
  return items.map((item) => ({
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  }));
}

function withEmptyReactionsOne<T extends Record<string, unknown> | null>(item: T) {
  if (!item) {
    return null;
  }

  return {
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  };
}

function buildPostSearchWhere(
  q?: string,
  searchIn: PostSearchIn = DEFAULT_POST_SEARCH_IN,
): Prisma.PostWhereInput {
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return {};
  }

  const titleFilter = { title: { contains: trimmedQuery, mode: "insensitive" as const } };
  const contentFilter = {
    content: { contains: trimmedQuery, mode: "insensitive" as const },
  };
  const authorFilter = {
    author: {
      OR: [
        { nickname: { contains: trimmedQuery, mode: "insensitive" as const } },
        { name: { contains: trimmedQuery, mode: "insensitive" as const } },
      ],
    },
  };

  if (searchIn === "TITLE") {
    return titleFilter;
  }
  if (searchIn === "CONTENT") {
    return contentFilter;
  }
  if (searchIn === "AUTHOR") {
    return authorFilter;
  }

  return {
    OR: [titleFilter, contentFilter, authorFilter],
  };
}

function buildPostListWhere({
  type,
  scope,
  communityId,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  days,
  authorBreedCode,
}: {
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  days?: number;
  authorBreedCode?: string;
}): Prisma.PostWhereInput {
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const typeFilter = type ? getEquivalentPostTypes(type) : null;
  const expandedExcludeTypes = expandExcludedPostTypes(excludeTypes);
  const normalizedAuthorBreedCode = normalizeBreedCode(authorBreedCode);
  const breedFilter = normalizedAuthorBreedCode
    ? {
        author: {
          pets: {
            some: {
              breedCode: normalizedAuthorBreedCode,
            },
          },
        },
      }
    : null;

  return {
    status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
    ...(typeFilter
      ? {
          type:
            typeFilter.length === 1
              ? typeFilter[0]
              : {
                  in: typeFilter,
                },
        }
      : expandedExcludeTypes.length > 0
        ? { type: { notIn: expandedExcludeTypes } }
        : {}),
    scope,
    ...(communityId ? { communityId } : {}),
    ...(scope === PostScope.LOCAL && neighborhoodId
      ? { neighborhoodId }
      : scope === PostScope.LOCAL
        ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
        : {}),
    ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
    ...buildPostSearchWhere(q, searchIn),
    ...(breedFilter ? { AND: [breedFilter] } : {}),
  };
}

function isPostTypeFullyExcluded(type: PostType | undefined, excludeTypes: PostType[]) {
  if (!type) {
    return false;
  }

  const equivalentTypes = getEquivalentPostTypes(type);
  return equivalentTypes.every((value) => excludeTypes.includes(value));
}

function buildBestPostWhere({
  days,
  minLikes,
  type,
  scope,
  communityId,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days: number;
  minLikes: number;
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
}): Prisma.PostWhereInput {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return {
    ...buildPostListWhere({
      type,
      scope,
      communityId,
      q,
      searchIn,
      excludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    }),
    likeCount: { gte: minLikes },
    createdAt: { gte: since },
  };
}

type PostListOptions = {
  cursor?: string;
  limit: number;
  page?: number;
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn?: PostSearchIn;
  sort?: PostListSort;
  days?: number;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
  personalized?: boolean;
  authorBreedCode?: string;
};

type BestPostListOptions = {
  limit: number;
  page?: number;
  days: number;
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

type PostCountOptions = {
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn?: PostSearchIn;
  days?: number;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

type BestPostCountOptions = {
  days: number;
  type?: PostType;
  scope: PostScope;
  communityId?: string;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

type PetSignal = {
  userId: string;
  species: string;
  breedCode: string | null;
  sizeClass: string;
};

type FeedLikePost = {
  id: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  author: {
    id: string;
  };
};

function normalizeBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function calculatePersonalizationBoost(
  authorPets: PetSignal[],
  viewerPets: PetSignal[],
) {
  if (authorPets.length === 0 || viewerPets.length === 0) {
    return 0;
  }

  let best = 0;
  for (const authorPet of authorPets) {
    const authorBreedCode = normalizeBreedCode(authorPet.breedCode);

    for (const viewerPet of viewerPets) {
      let score = 0;
      const viewerBreedCode = normalizeBreedCode(viewerPet.breedCode);

      if (viewerBreedCode && authorBreedCode && viewerBreedCode === authorBreedCode) {
        score += 0.45;
      }
      if (viewerPet.sizeClass !== "UNKNOWN" && authorPet.sizeClass === viewerPet.sizeClass) {
        score += 0.2;
      }
      if (authorPet.species === viewerPet.species) {
        score += 0.1;
      }

      if (score > best) {
        best = score;
      }
    }
  }

  return best;
}

function calculateFeedScore(
  post: FeedLikePost,
  viewerPets: PetSignal[],
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  const ageHours = Math.max(1, (Date.now() - post.createdAt.getTime()) / 3_600_000);
  const recency = 1 / Math.sqrt(ageHours);
  const engagement =
    Math.log1p(post.likeCount * 2 + post.commentCount * 1.6 + post.viewCount * 0.15) / 6;
  const personalization = calculatePersonalizationBoost(
    authorPetByUserId.get(post.author.id) ?? [],
    viewerPets,
  );

  return recency * 0.5 + engagement * 0.35 + personalization;
}

function interleaveForDiversity<T>(personalized: T[], explore: T[], personalizedRatio: number) {
  const total = personalized.length + explore.length;
  if (total === 0) {
    return [] as T[];
  }

  const targetPersonalized = Math.max(
    0,
    Math.min(personalized.length, Math.ceil(total * personalizedRatio)),
  );
  const targetExplore = Math.max(0, total - targetPersonalized);

  const selectedPersonalized = personalized.slice(0, targetPersonalized);
  const selectedExplore = explore.slice(0, targetExplore);
  const result: T[] = [];

  let pIndex = 0;
  let eIndex = 0;
  while (result.length < total && (pIndex < selectedPersonalized.length || eIndex < selectedExplore.length)) {
    const personalizedShare = result.length === 0 ? 0 : pIndex / result.length;
    const shouldPickPersonalized =
      pIndex < selectedPersonalized.length &&
      (eIndex >= selectedExplore.length || personalizedShare < personalizedRatio);

    if (shouldPickPersonalized) {
      result.push(selectedPersonalized[pIndex]);
      pIndex += 1;
      continue;
    }

    if (eIndex < selectedExplore.length) {
      result.push(selectedExplore[eIndex]);
      eIndex += 1;
      continue;
    }

    if (pIndex < selectedPersonalized.length) {
      result.push(selectedPersonalized[pIndex]);
      pIndex += 1;
    }
  }

  if (result.length < total) {
    result.push(...personalized.slice(pIndex), ...explore.slice(eIndex));
  }

  return result.slice(0, total);
}

async function applyPetPersonalization<T extends FeedLikePost>(
  items: T[],
  viewerId: string,
) {
  if (items.length < 2) {
    return items;
  }

  const viewerPetsRaw = await prisma.pet.findMany({
    where: { userId: viewerId },
    select: {
      userId: true,
      species: true,
      breedCode: true,
      sizeClass: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  const viewerPets: PetSignal[] = viewerPetsRaw.map((pet) => ({
    userId: pet.userId,
    species: String(pet.species),
    breedCode: normalizeBreedCode(pet.breedCode),
    sizeClass: String(pet.sizeClass),
  }));
  if (viewerPets.length === 0) {
    return items;
  }

  const authorIds = Array.from(new Set(items.map((item) => item.author.id)));
  if (authorIds.length === 0) {
    return items;
  }

  const authorPetSignalsRaw = await prisma.pet.findMany({
    where: {
      userId: { in: authorIds },
    },
    select: {
      userId: true,
      species: true,
      breedCode: true,
      sizeClass: true,
    },
  });
  const authorPetSignals: PetSignal[] = authorPetSignalsRaw.map((pet) => ({
    userId: pet.userId,
    species: String(pet.species),
    breedCode: normalizeBreedCode(pet.breedCode),
    sizeClass: String(pet.sizeClass),
  }));

  const authorPetByUserId = new Map<string, PetSignal[]>();
  for (const pet of authorPetSignals) {
    const list = authorPetByUserId.get(pet.userId);
    if (list) {
      list.push(pet);
      continue;
    }
    authorPetByUserId.set(pet.userId, [pet]);
  }

  const scored = items
    .map((item) => {
      const boost = calculatePersonalizationBoost(
        authorPetByUserId.get(item.author.id) ?? [],
        viewerPets,
      );

      return {
        item,
        boost,
        score: calculateFeedScore(item, viewerPets, authorPetByUserId),
      };
    })
    .sort((a, b) => b.score - a.score);

  const personalized = scored.filter((entry) => entry.boost > 0.05).map((entry) => entry.item);
  const personalizedSet = new Set(personalized.map((item) => item.id));
  const explore = scored
    .filter((entry) => !personalizedSet.has(entry.item.id))
    .map((entry) => entry.item);

  return interleaveForDiversity(personalized, explore, 0.65);
}

export async function getPostById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const visibilityFilter =
    hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {};

  if (!supportsPostReactionsField()) {
    const post = await prisma.post
      .findFirst({
        where: { id, ...visibilityFilter },
        include: buildPostDetailIncludeWithoutReactions(),
      })
      .catch(async (error) => {
        if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
          throw error;
        }

        if (isUnknownGuestAuthorIncludeError(error)) {
          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            include: buildPostDetailIncludeWithoutReactions(false),
          });
        }

        return prisma.post.findFirst({
          where: { id, ...visibilityFilter },
          select: buildLegacyPostDetailSelectWithoutReactions(),
        });
      });
    return withEmptyReactionsOne(withEmptyGuestPostMetaOne(post));
  }

  try {
    return await prisma.post
      .findFirst({
        where: { id, ...visibilityFilter },
        include: buildPostDetailInclude(viewerId),
      })
      .catch(async (error) => {
        if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
          throw error;
        }

        if (isUnknownGuestAuthorIncludeError(error)) {
          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            include: buildPostDetailInclude(viewerId, false),
          });
        }

        const post = await prisma.post.findFirst({
          where: { id, ...visibilityFilter },
          select: buildLegacyPostDetailSelect(viewerId),
        });
        return withEmptyGuestPostMetaOne(post);
      });
  } catch (error) {
    if (
      !isUnknownReactionsIncludeError(error) &&
      !isUnknownGuestPostColumnError(error) &&
      !isUnknownGuestAuthorIncludeError(error)
    ) {
      throw error;
    }

    const post = await prisma.post
      .findFirst({
        where: { id, ...visibilityFilter },
        include: buildPostDetailIncludeWithoutReactions(!isUnknownGuestAuthorIncludeError(error)),
      })
      .catch(async (innerError) => {
        if (!isUnknownGuestPostColumnError(innerError) && !isUnknownGuestAuthorIncludeError(innerError)) {
          throw innerError;
        }

        if (isUnknownGuestAuthorIncludeError(innerError)) {
          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            include: buildPostDetailIncludeWithoutReactions(false),
          });
        }

        return prisma.post.findFirst({
          where: { id, ...visibilityFilter },
          select: buildLegacyPostDetailSelectWithoutReactions(),
        });
      });
    return withEmptyReactionsOne(withEmptyGuestPostMetaOne(post));
  }
}

export async function getPostMetadataById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }

  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const visibilityFilter =
    hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {};

  return prisma.post.findFirst({
    where: { id, ...visibilityFilter },
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });
}

export async function listPosts({
  cursor,
  limit: _limit,
  page,
  type,
  scope,
  communityId,
  q,
  searchIn,
  sort,
  days,
  excludeTypes,
  neighborhoodId,
  viewerId,
  personalized,
  authorBreedCode,
}: PostListOptions) {
  const resolvedLimit = Math.min(Math.max(_limit, 1), FEED_PAGE_SIZE);
  const resolvedPage = Math.max(page ?? 1, 1);
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return { items: [], nextCursor: null };
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const resolvedSort = sort ?? DEFAULT_POST_LIST_SORT;
  const where = buildPostListWhere({
    type,
    scope,
    communityId,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    days,
    authorBreedCode,
  });
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    resolvedSort === "LIKE"
      ? [
          { likeCount: "desc" },
          { commentCount: "desc" },
          { createdAt: "desc" },
        ]
      : resolvedSort === "COMMENT"
        ? [
            { commentCount: "desc" },
            { likeCount: "desc" },
            { createdAt: "desc" },
          ]
        : [{ createdAt: "desc" }];

  const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
    where,
    take: resolvedLimit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : resolvedPage > 1
        ? {
            skip: (resolvedPage - 1) * resolvedLimit,
          }
        : {}),
    orderBy,
  };

  if (!supportsPostReactionsField()) {
    const fallbackItems = await prisma.post
      .findMany({
        ...baseArgs,
        include: buildPostListIncludeWithoutReactions(),
      })
      .catch(async (error) => {
        if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
          throw error;
        }

        if (isUnknownGuestAuthorIncludeError(error)) {
          return prisma.post.findMany({
            ...baseArgs,
            include: buildPostListIncludeWithoutReactions(false),
          });
        }

        return prisma.post.findMany({
          ...baseArgs,
          select: buildLegacyPostListSelectWithoutReactions(),
        });
      });
    const items = withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
    let nextCursor: string | null = null;
    if (items.length > resolvedLimit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { items, nextCursor };
  }

  const items = await prisma.post
    .findMany({
      ...baseArgs,
      include: buildPostListInclude(viewerId),
    })
    .catch(async (error) => {
      if (
        !isUnknownReactionsIncludeError(error) &&
        !isUnknownGuestPostColumnError(error) &&
        !isUnknownGuestAuthorIncludeError(error)
      ) {
        throw error;
      }

      if (isUnknownGuestAuthorIncludeError(error)) {
        return prisma.post.findMany({
          ...baseArgs,
          include: buildPostListInclude(viewerId, false),
        });
      }

      if (isUnknownGuestPostColumnError(error)) {
        const legacyItems = await prisma.post.findMany({
          ...baseArgs,
          select: buildLegacyPostListSelect(viewerId),
        });
        return withEmptyGuestPostMeta(legacyItems);
      }

      const fallbackItems = await prisma.post
        .findMany({
          ...baseArgs,
          include: buildPostListIncludeWithoutReactions(),
        })
        .catch(async (innerError) => {
          if (
            !isUnknownGuestPostColumnError(innerError) &&
            !isUnknownGuestAuthorIncludeError(innerError)
          ) {
            throw innerError;
          }

          if (isUnknownGuestAuthorIncludeError(innerError)) {
            return prisma.post.findMany({
              ...baseArgs,
              include: buildPostListIncludeWithoutReactions(false),
            });
          }

          return prisma.post.findMany({
            ...baseArgs,
            select: buildLegacyPostListSelectWithoutReactions(),
          });
        });
      return withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
    });

  let nextCursor: string | null = null;
  if (items.length > resolvedLimit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  if (personalized && viewerId) {
    const personalizedItems = await applyPetPersonalization(items, viewerId);
    return {
      items: personalizedItems,
      nextCursor,
    };
  }

  return { items, nextCursor };
}

export async function listBestPosts({
  limit: _limit,
  page,
  days,
  type,
  scope,
  communityId,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  minLikes = 1,
  viewerId,
}: BestPostListOptions) {
  const resolvedLimit = Math.min(Math.max(_limit, 1), FEED_PAGE_SIZE);
  const resolvedPage = Math.max(page ?? 1, 1);
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const where = buildBestPostWhere({
    days,
    minLikes,
    type,
    scope,
    communityId,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  });

  const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
    where,
    take: resolvedLimit,
    ...(resolvedPage > 1
      ? {
          skip: (resolvedPage - 1) * resolvedLimit,
        }
      : {}),
    orderBy: [
      { likeCount: "desc" },
      { commentCount: "desc" },
      { viewCount: "desc" },
      { createdAt: "desc" },
    ],
  };

  if (!supportsPostReactionsField()) {
    const fallbackItems = await prisma.post
      .findMany({
        ...baseArgs,
        include: buildPostListIncludeWithoutReactions(),
      })
      .catch(async (error) => {
        if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
          throw error;
        }

        if (isUnknownGuestAuthorIncludeError(error)) {
          return prisma.post.findMany({
            ...baseArgs,
            include: buildPostListIncludeWithoutReactions(false),
          });
        }

        return prisma.post.findMany({
          ...baseArgs,
          select: buildLegacyPostListSelectWithoutReactions(),
        });
      });
    return withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
  }

  return prisma.post
    .findMany({
      ...baseArgs,
      include: buildPostListInclude(viewerId),
    })
    .catch(async (error) => {
      if (
        !isUnknownReactionsIncludeError(error) &&
        !isUnknownGuestPostColumnError(error) &&
        !isUnknownGuestAuthorIncludeError(error)
      ) {
        throw error;
      }

      if (isUnknownGuestAuthorIncludeError(error)) {
        return prisma.post.findMany({
          ...baseArgs,
          include: buildPostListInclude(viewerId, false),
        });
      }

      if (isUnknownGuestPostColumnError(error)) {
        const legacyItems = await prisma.post.findMany({
          ...baseArgs,
          select: buildLegacyPostListSelect(viewerId),
        });
        return withEmptyGuestPostMeta(legacyItems);
      }

      const fallbackItems = await prisma.post
        .findMany({
          ...baseArgs,
          include: buildPostListIncludeWithoutReactions(),
        })
        .catch(async (innerError) => {
          if (
            !isUnknownGuestPostColumnError(innerError) &&
            !isUnknownGuestAuthorIncludeError(innerError)
          ) {
            throw innerError;
          }

          if (isUnknownGuestAuthorIncludeError(innerError)) {
            return prisma.post.findMany({
              ...baseArgs,
              include: buildPostListIncludeWithoutReactions(false),
            });
          }

          return prisma.post.findMany({
            ...baseArgs,
            select: buildLegacyPostListSelectWithoutReactions(),
          });
        });
      return withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
    });
}

export async function countPosts({
  type,
  scope,
  communityId,
  q,
  searchIn,
  days,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: PostCountOptions) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return 0;
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const where = buildPostListWhere({
    type,
    scope,
    communityId,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    days,
  });

  return prisma.post.count({ where });
}

export async function countBestPosts({
  days,
  type,
  scope,
  communityId,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  minLikes = 1,
  viewerId,
}: BestPostCountOptions) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return 0;
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const where = buildBestPostWhere({
    days,
    minLikes,
    type,
    scope,
    communityId,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  });

  return prisma.post.count({ where });
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
  const equivalentTypes = type ? getEquivalentPostTypes(type) : null;

  return prisma.post.findMany({
    where: {
      authorId,
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(scope ? { scope } : {}),
      ...(equivalentTypes
        ? {
            type:
              equivalentTypes.length === 1
                ? equivalentTypes[0]
                : {
                    in: equivalentTypes,
                  },
          }
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
    orderBy: { createdAt: "desc" },
    include: {
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
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

type PostSearchSuggestionOptions = {
  q: string;
  limit: number;
  type?: PostType;
  scope: PostScope;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

type RankedPostSearchOptions = {
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

function buildRankedSearchWhereSql({
  scope,
  type,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  searchSql,
}: {
  scope: PostScope;
  type?: PostType;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  searchSql: Prisma.Sql;
}) {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`p."status" IN ('ACTIVE'::"PostStatus", 'HIDDEN'::"PostStatus")`,
    Prisma.sql`p."scope"::text = ${scope}`,
    searchSql,
  ];

  if (type) {
    const equivalentTypes = getEquivalentPostTypes(type);
    if (equivalentTypes.length === 1) {
      clauses.push(Prisma.sql`p."type"::text = ${equivalentTypes[0]}`);
    } else {
      clauses.push(Prisma.sql`p."type"::text IN (${Prisma.join(equivalentTypes)})`);
    }
  } else if (excludeTypes.length > 0) {
    const expandedExcludeTypes = expandExcludedPostTypes(excludeTypes);
    const excludedSql = Prisma.join(expandedExcludeTypes);
    clauses.push(Prisma.sql`p."type"::text NOT IN (${excludedSql})`);
  }

  if (scope === PostScope.LOCAL) {
    clauses.push(
      Prisma.sql`p."neighborhoodId" = ${neighborhoodId ?? "__NO_NEIGHBORHOOD__"}`,
    );
  }

  if (hiddenAuthorIds.length > 0) {
    clauses.push(Prisma.sql`p."authorId" NOT IN (${Prisma.join(hiddenAuthorIds)})`);
  }

  return Prisma.join(clauses, " AND ");
}

function buildRankedSearchMatchSql(
  searchIn: PostSearchIn,
  query: string,
  pattern: string,
  compactPattern: string,
  useTrigram: boolean,
) {
  const compactQuery = query.replace(/\s+/g, "");
  const titleSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."title", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const titleCompactSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(REPLACE(COALESCE(p."title", ''), ' ', ''), ${compactQuery}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const contentSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."content", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const authorNicknameSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(u."nickname", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const authorNameSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(u."name", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;

  const titleMatch = Prisma.sql`(
    p."title" ILIKE ${pattern}
    OR REPLACE(COALESCE(p."title", ''), ' ', '') ILIKE ${compactPattern}
    OR to_tsvector('simple', COALESCE(p."title", '')) @@ websearch_to_tsquery('simple', ${query})
    OR to_tsvector('simple', REPLACE(COALESCE(p."title", ''), ' ', '')) @@ websearch_to_tsquery('simple', ${compactQuery})
    ${titleSimilaritySql}
    ${titleCompactSimilaritySql}
  )`;

  const contentMatch = Prisma.sql`(
    p."content" ILIKE ${pattern}
    OR to_tsvector('simple', COALESCE(p."content", '')) @@ websearch_to_tsquery('simple', ${query})
    ${contentSimilaritySql}
  )`;

  const authorMatch = Prisma.sql`(
    COALESCE(u."nickname", '') ILIKE ${pattern}
    OR COALESCE(u."name", '') ILIKE ${pattern}
    OR to_tsvector('simple', CONCAT_WS(' ', COALESCE(u."nickname", ''), COALESCE(u."name", ''))) @@ websearch_to_tsquery('simple', ${query})
    ${authorNicknameSimilaritySql}
    ${authorNameSimilaritySql}
  )`;

  if (searchIn === "TITLE") {
    return titleMatch;
  }
  if (searchIn === "CONTENT") {
    return contentMatch;
  }
  if (searchIn === "AUTHOR") {
    return authorMatch;
  }

  return Prisma.sql`(${titleMatch} OR ${contentMatch} OR ${authorMatch})`;
}

type RankedSearchRow = {
  id: string;
};

export async function listRankedSearchPosts({
  limit,
  type,
  scope,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: RankedPostSearchOptions) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const likePattern = `%${trimmedQuery}%`;
  const compactQuery = trimmedQuery.replace(/\s+/g, "");
  const compactPattern = `%${compactQuery}%`;
  const useTrigram = await supportsPgTrgm();
  const searchMatchSql = buildRankedSearchMatchSql(
    resolvedSearchIn,
    trimmedQuery,
    likePattern,
    compactPattern,
    useTrigram,
  );
  const whereSql = buildRankedSearchWhereSql({
    scope,
    type,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    searchSql: searchMatchSql,
  });
  const candidateLimit = Math.min(Math.max(safeLimit * 4, safeLimit), 200);
  const trigramScoreSql = useTrigram
    ? Prisma.sql`+ GREATEST(
          similarity(COALESCE(p."title", ''), ${trimmedQuery}),
          similarity(COALESCE(p."content", ''), ${trimmedQuery}),
          similarity(COALESCE(u."nickname", ''), ${trimmedQuery}),
          similarity(COALESCE(u."name", ''), ${trimmedQuery})
        ) * 4.0`
    : Prisma.sql``;

  try {
    const candidates = await prisma.$queryRaw<RankedSearchRow[]>(Prisma.sql`
      SELECT p."id"
      FROM "Post" p
      INNER JOIN "User" u ON u."id" = p."authorId"
      WHERE ${whereSql}
      ORDER BY
        (
          ts_rank_cd(
            setweight(to_tsvector('simple', COALESCE(p."title", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(u."nickname", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(u."name", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(p."content", '')), 'B'),
            websearch_to_tsquery('simple', ${trimmedQuery})
          ) * 9.0
          ${trigramScoreSql}
          + CASE WHEN p."title" ILIKE ${likePattern} THEN 1.5 ELSE 0 END
          + CASE
              WHEN REPLACE(COALESCE(p."title", ''), ' ', '') ILIKE ${compactPattern}
              THEN 0.8
              ELSE 0
            END
          + CASE
              WHEN COALESCE(u."nickname", '') ILIKE ${likePattern}
                OR COALESCE(u."name", '') ILIKE ${likePattern}
              THEN 1.0
              ELSE 0
            END
          + GREATEST(
              0,
              1.2 - (EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 86400.0) / 30.0
            )
        ) DESC,
        p."createdAt" DESC
      LIMIT ${candidateLimit}
    `);

    const candidateIds = Array.from(
      new Set(
        candidates
          .map((item) => item.id)
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    if (candidateIds.length === 0) {
      return [];
    }

    const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
      where: {
        id: { in: candidateIds },
        ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      },
    };

    const fetchedPosts = !supportsPostReactionsField()
      ? withEmptyReactions(
          await prisma.post.findMany({
            ...baseArgs,
            include: buildPostListIncludeWithoutReactions(),
          }),
        )
      : await prisma.post
          .findMany({
            ...baseArgs,
            include: buildPostListInclude(viewerId),
          })
          .catch(async (error) => {
            if (!isUnknownReactionsIncludeError(error) && !isUnknownGuestAuthorIncludeError(error)) {
              throw error;
            }

            if (isUnknownGuestAuthorIncludeError(error)) {
              return prisma.post.findMany({
                ...baseArgs,
                include: buildPostListInclude(viewerId, false),
              });
            }

            const fallbackItems = await prisma.post.findMany({
              ...baseArgs,
              include: buildPostListIncludeWithoutReactions(),
            });
            return withEmptyReactions(fallbackItems);
          });

    const byId = new Map(fetchedPosts.map((item) => [item.id, item]));
    return candidateIds
      .map((id) => byId.get(id))
      .filter((item): item is (typeof fetchedPosts)[number] => Boolean(item))
      .slice(0, safeLimit);
  } catch (error) {
    logger.warn("고급 검색 쿼리 실패로 기본 검색으로 fallback합니다.", {
      query: trimmedQuery,
      searchIn: resolvedSearchIn,
      error: serializeError(error),
    });

    const fallback = await listPosts({
      limit: Math.min(Math.max(safeLimit * 3, safeLimit), 80),
      type,
      scope,
      q: trimmedQuery,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      viewerId,
    });
    return fallback.items.slice(0, safeLimit);
  }
}

export async function listPostSearchSuggestions({
  q,
  limit,
  type,
  scope,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: PostSearchSuggestionOptions) {
  const trimmedQuery = q.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const rows = await prisma.post.findMany({
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type
        ? (() => {
            const equivalentTypes = getEquivalentPostTypes(type);
            return equivalentTypes.length === 1
              ? { type: equivalentTypes[0] }
              : { type: { in: equivalentTypes } };
          })()
        : normalizedExcludeTypes.length > 0
          ? { type: { notIn: normalizedExcludeTypes } }
          : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      ...buildPostSearchWhere(trimmedQuery, resolvedSearchIn),
    },
    select: {
      title: true,
      author: {
        select: {
          nickname: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit * 3, limit), 30),
  });

  const lowerQuery = trimmedQuery.toLowerCase();
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const addSuggestion = (value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    const lower = normalized.toLowerCase();
    if (!lower.includes(lowerQuery) || seen.has(lower)) {
      return;
    }

    seen.add(lower);
    suggestions.push(normalized);
  };

  for (const row of rows) {
    if (resolvedSearchIn === "AUTHOR") {
      addSuggestion(row.author.nickname);
      addSuggestion(row.author.name);
    } else {
      addSuggestion(row.title);
      if (resolvedSearchIn === "ALL") {
        addSuggestion(row.author.nickname);
        addSuggestion(row.author.name);
      }
    }

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions.slice(0, limit);
}
