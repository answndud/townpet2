import {
  PostReactionType,
  PostScope,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";

import {
  extractAudienceSegmentBreedLabel,
  hasBreedLoungeRoute,
} from "@/lib/pet-profile";
import { prisma } from "@/lib/prisma";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import {
  expandExcludedPostTypes,
  getEquivalentPostTypes,
  isFreeBoardPostType,
} from "@/lib/post-type-groups";
import type { ReviewCategory } from "@/lib/review-category";
import { logger, serializeError } from "@/server/logger";
import { listPreferredPetTypeIdsByUserId } from "@/server/queries/user.queries";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";

const NO_VIEWER_ID = "__NO_VIEWER__";
export type PostListSort = "LATEST" | "LIKE" | "COMMENT";
export type PostSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
const DEFAULT_POST_LIST_SORT: PostListSort = "LATEST";
const DEFAULT_POST_SEARCH_IN: PostSearchIn = "ALL";
const SEARCH_SIMILARITY_THRESHOLD = 0.12;
let postReactionsFieldSupport: boolean | null = null;
let postGuestAuthorFieldSupport: boolean | null = null;
let postReviewCategoryFieldSupport: boolean | null = null;
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
    petType: {
      select: {
        id: true,
        labelKo: true,
        tags: true,
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
    petType: {
      select: {
        id: true,
        labelKo: true,
        tags: true,
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


const HOSPITAL_REVIEW_SELECT = {
  hospitalName: true,
  totalCost: true,
  waitTime: true,
  rating: true,
  treatmentType: true,
} as const;

const PLACE_REVIEW_SELECT = {
  placeName: true,
  placeType: true,
  address: true,
  isPetAllowed: true,
  rating: true,
} as const;

const REVIEW_BOARD_TYPES = [PostType.PLACE_REVIEW, PostType.PRODUCT_REVIEW] as const;

const WALK_ROUTE_SELECT = {
  routeName: true,
  distance: true,
  duration: true,
  difficulty: true,
  hasStreetLights: true,
  hasRestroom: true,
  hasParkingLot: true,
  safetyTags: true,
} as const;

type PostDetailExtras = {
  hospitalReview: {
    hospitalName: string | null;
    totalCost: number | null;
    waitTime: number | null;
    rating: number | null;
    treatmentType: string | null;
  } | null;
  placeReview: {
    placeName: string | null;
    placeType: string | null;
    address: string | null;
    isPetAllowed: boolean | null;
    rating: number | null;
  } | null;
  walkRoute: {
    routeName: string | null;
    distance: number | null;
    duration: number | null;
    difficulty: string | null;
    hasStreetLights: boolean | null;
    hasRestroom: boolean | null;
    hasParkingLot: boolean | null;
    safetyTags: string[] | null;
  } | null;
};

const buildPostDetailBaseInclude = (includeGuestAuthor = supportsPostGuestAuthorField()) =>
  ({
    author: { select: { id: true, name: true, nickname: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
    neighborhood: {
      select: { id: true, name: true, city: true },
    },
    images: {
      select: { url: true, order: true },
    },
  }) as const;

const buildPostDetailBaseIncludeWithoutReactions = (
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, name: true, nickname: true } },
    ...(includeGuestAuthor
      ? { guestAuthor: { select: { id: true, displayName: true, ipDisplay: true, ipLabel: true } } }
      : {}),
    neighborhood: {
      select: { id: true, name: true, city: true },
    },
    images: {
      select: { url: true, order: true },
    },
  }) as const;

async function attachPostDetailExtras<T extends { id: string; type: PostType }>(
  post: T | null,
): Promise<(T & PostDetailExtras) | null> {
  if (!post) {
    return null;
  }

  const needsHospital = post.type === PostType.HOSPITAL_REVIEW;
  const needsPlace = post.type === PostType.PLACE_REVIEW;
  const needsWalk = post.type === PostType.WALK_ROUTE;
  const tasks: Array<Promise<void>> = [];
  const target = post as T & PostDetailExtras;

  if (needsHospital) {
    if (target.hospitalReview === undefined) {
      tasks.push(
        prisma.hospitalReview
          .findUnique({ where: { postId: post.id }, select: HOSPITAL_REVIEW_SELECT })
          .then((review) => {
            target.hospitalReview = review;
          }),
      );
    }
  } else if (target.hospitalReview === undefined) {
    target.hospitalReview = null;
  }

  if (needsPlace) {
    if (target.placeReview === undefined) {
      tasks.push(
        prisma.placeReview
          .findUnique({ where: { postId: post.id }, select: PLACE_REVIEW_SELECT })
          .then((review) => {
            target.placeReview = review;
          }),
      );
    }
  } else if (target.placeReview === undefined) {
    target.placeReview = null;
  }

  if (needsWalk) {
    if (target.walkRoute === undefined) {
      tasks.push(
        prisma.walkRoute
          .findUnique({ where: { postId: post.id }, select: WALK_ROUTE_SELECT })
          .then((route) => {
            target.walkRoute = route;
          }),
      );
    }
  } else if (target.walkRoute === undefined) {
    target.walkRoute = null;
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return target;
}

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
  author: { select: { id: true, name: true, nickname: true } },
  neighborhood: {
    select: { id: true, name: true, city: true },
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
    select: { url: true, order: true },
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

const buildLegacyPostDetailSelect = () =>
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

function isMissingPostReactionTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    if (tableName.includes("PostReaction")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("PostReaction") &&
    error.message.includes("does not exist")
  );
}

function isUnavailableReactionsIncludeError(error: unknown) {
  return isUnknownReactionsIncludeError(error) || isMissingPostReactionTableError(error);
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
    message.includes("guestFingerprintHash")
  );
}

function isUnknownReviewCategoryFieldError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Unknown argument `reviewCategory`");
}

function isMissingReviewCategoryColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    if (columnName.includes("Post.reviewCategory")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("Post.reviewCategory") &&
    error.message.includes("does not exist")
  );
}

function isUnsupportedReviewCategoryFilterError(error: unknown) {
  return isUnknownReviewCategoryFieldError(error) || isMissingReviewCategoryColumnError(error);
}

function isMissingCommunityBoardSchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    return tableName.includes("Community") || tableName.includes("CommunityCategory");
  }

  if (error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    return (
      columnName.includes("Post.boardScope") ||
      // Legacy column name for petTypeId is kept in DB via @map("communityId").
      columnName.includes("Post.communityId") ||
      columnName.includes("Post.commonBoardType") ||
      columnName.includes("Post.animalTags")
    );
  }

  return false;
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

  postReactionsFieldSupport = true;
  return true;
}

function supportsPostGuestAuthorField() {
  if (postGuestAuthorFieldSupport !== null) {
    return postGuestAuthorFieldSupport;
  }

  postGuestAuthorFieldSupport = true;
  return true;
}

function supportsPostReviewCategoryField() {
  if (postReviewCategoryFieldSupport !== null) {
    return postReviewCategoryFieldSupport;
  }

  postReviewCategoryFieldSupport = true;
  return true;
}

function toLegacyReviewTypeFallback(type: PostType | undefined, reviewCategory?: ReviewCategory) {
  if (type) {
    return type;
  }
  if (!reviewCategory) {
    return undefined;
  }

  if (reviewCategory === "PLACE") {
    return PostType.PLACE_REVIEW;
  }

  return PostType.PRODUCT_REVIEW;
}

function withEmptyReactions<T extends Record<string, unknown>>(items: T[]) {
  return items.map((item) => ({
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  }));
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
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  days,
  authorBreedCode,
}: {
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
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
  const shouldIgnorePetTypeFilter = typeFilter ? typeFilter.some((item) => isFreeBoardPostType(item)) : false;
  const expandedExcludeTypes = expandExcludedPostTypes(excludeTypes);
  const normalizedAuthorBreedCode = normalizeBreedCode(authorBreedCode);
  const normalizedPetTypeIds =
    petTypeIds && petTypeIds.length > 0 ? Array.from(new Set(petTypeIds)) : [];
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
    status: PostStatus.ACTIVE,
    ...(typeFilter
      ? {
          type:
            typeFilter.length === 1
              ? typeFilter[0]
              : {
                  in: typeFilter,
                },
        }
      : reviewBoard
        ? { type: { in: [...REVIEW_BOARD_TYPES] } }
      : expandedExcludeTypes.length > 0
        ? { type: { notIn: expandedExcludeTypes } }
        : {}),
    ...(reviewCategory ? { reviewCategory } : {}),
    scope,
    ...(!shouldIgnorePetTypeFilter
      ? normalizedPetTypeIds.length > 0
        ? { petTypeId: { in: normalizedPetTypeIds } }
        : petTypeId
          ? { petTypeId }
          : {}
      : {}),
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
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days: number;
  minLikes: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
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
      reviewBoard,
      reviewCategory,
      scope,
      petTypeId,
      petTypeIds,
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
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
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
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

type PostCountOptions = {
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
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
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
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
  breedLabel: string | null;
  sizeClass: string;
  lifeStage: string;
};

type FeedLikePost = {
  id: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  petTypeId?: string | null;
  type?: PostType;
  reviewCategory?: ReviewCategory | null;
  animalTags?: string[];
  petType?: {
    tags?: string[] | null;
  } | null;
  author: {
    id: string;
  };
};

type ViewerPersonalizationContext = {
  petSignals: PetSignal[];
  preferredPetTypeIds: string[];
  preferredInterestLabels: string[];
};

const REVIEW_CATEGORY_INTEREST_LABELS: Partial<Record<ReviewCategory, string[]>> = {
  FEED: ["사료"],
  SNACK: ["간식"],
  TOY: ["장난감"],
  PLACE: ["장소", "산책"],
  SUPPLIES: ["용품"],
  ETC: ["후기"],
};

const POST_TYPE_INTEREST_LABELS: Partial<Record<PostType, string[]>> = {
  WALK_ROUTE: ["산책"],
  HOSPITAL_REVIEW: ["건강", "병원"],
  PLACE_REVIEW: ["장소"],
  PRODUCT_REVIEW: ["용품", "후기"],
  PET_SHOWCASE: ["행동", "일상"],
  QA_QUESTION: ["질문"],
  QA_ANSWER: ["질문"],
};

function normalizeBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeBreedLabel(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeInterestLabel(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function dedupeInterestLabels(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
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
    const authorBreedLabel = normalizeBreedLabel(authorPet.breedLabel);
    const authorHasSpecificBreed = hasBreedLoungeRoute(authorBreedCode);

    for (const viewerPet of viewerPets) {
      let score = 0;
      const viewerBreedCode = normalizeBreedCode(viewerPet.breedCode);
      const viewerBreedLabel = normalizeBreedLabel(viewerPet.breedLabel);
      const viewerHasSpecificBreed = hasBreedLoungeRoute(viewerBreedCode);

      if (
        viewerHasSpecificBreed &&
        authorHasSpecificBreed &&
        viewerBreedCode &&
        authorBreedCode &&
        viewerBreedCode === authorBreedCode
      ) {
        score += 0.45;
      } else if (
        viewerBreedLabel &&
        authorBreedLabel &&
        viewerBreedLabel === authorBreedLabel
      ) {
        score += 0.22;
      }
      if (viewerPet.sizeClass !== "UNKNOWN" && authorPet.sizeClass === viewerPet.sizeClass) {
        score += 0.16;
      }
      if (viewerPet.lifeStage !== "UNKNOWN" && authorPet.lifeStage === viewerPet.lifeStage) {
        score += 0.12;
      }
      if (authorPet.species === viewerPet.species) {
        score += 0.08;
      }

      if (score > best) {
        best = score;
      }
    }
  }

  return best;
}

function calculatePreferredPetTypeBoost(
  postPetTypeId: string | null | undefined,
  preferredPetTypeIds: string[],
) {
  if (!postPetTypeId || preferredPetTypeIds.length === 0) {
    return 0;
  }

  return preferredPetTypeIds.includes(postPetTypeId) ? 0.12 : 0;
}

function collectPostInterestLabels(post: FeedLikePost) {
  return dedupeInterestLabels([
    ...(post.animalTags ?? []).map((tag) => normalizeInterestLabel(tag)),
    ...((post.petType?.tags ?? []) as string[]).map((tag) => normalizeInterestLabel(tag)),
    ...((post.type ? POST_TYPE_INTEREST_LABELS[post.type] : []) ?? []).map((tag) =>
      normalizeInterestLabel(tag),
    ),
    ...((post.reviewCategory ? REVIEW_CATEGORY_INTEREST_LABELS[post.reviewCategory] : []) ?? []).map(
      (tag) => normalizeInterestLabel(tag),
    ),
  ]);
}

function calculatePreferredInterestBoost(
  post: FeedLikePost,
  preferredInterestLabels: string[],
) {
  if (preferredInterestLabels.length === 0) {
    return 0;
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return 0;
  }

  const preferredInterestSet = new Set(preferredInterestLabels);
  let sharedCount = 0;
  for (const label of postInterestLabels) {
    if (preferredInterestSet.has(label)) {
      sharedCount += 1;
    }
  }

  return Math.min(0.09, sharedCount * 0.03);
}

function calculateViewerPersonalizationBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  const petBoost = calculatePersonalizationBoost(
    authorPetByUserId.get(post.author.id) ?? [],
    viewerContext.petSignals,
  );
  const preferredPetTypeBoost = calculatePreferredPetTypeBoost(
    post.petTypeId,
    viewerContext.preferredPetTypeIds,
  );
  const preferredInterestBoost = calculatePreferredInterestBoost(
    post,
    viewerContext.preferredInterestLabels,
  );

  return petBoost + preferredPetTypeBoost + preferredInterestBoost;
}

function calculateFeedScore(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  const ageHours = Math.max(1, (Date.now() - post.createdAt.getTime()) / 3_600_000);
  const recency = 1 / Math.sqrt(ageHours);
  const engagement =
    Math.log1p(post.likeCount * 2 + post.commentCount * 1.6 + post.viewCount * 0.15) / 6;
  const personalization = calculateViewerPersonalizationBoost(
    post,
    viewerContext,
    authorPetByUserId,
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

function mapToPetSignal(signal: {
  userId: string;
  species: string;
  breedCode: string | null;
  breedLabel?: string | null;
  sizeClass: string | null;
  lifeStage?: string | null;
}) {
  return {
    userId: signal.userId,
    species: String(signal.species),
    breedCode: normalizeBreedCode(signal.breedCode),
    breedLabel: normalizeBreedLabel(signal.breedLabel),
    sizeClass: signal.sizeClass ? String(signal.sizeClass) : "UNKNOWN",
    lifeStage: signal.lifeStage ? String(signal.lifeStage) : "UNKNOWN",
  } satisfies PetSignal;
}

function isMissingAudienceSegmentSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("UserAudienceSegment") ||
      columnName.includes("UserAudienceSegment")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("UserAudienceSegment") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

async function listViewerPetSignals(viewerId: string) {
  const viewerAudienceSignalsRaw = await prisma.userAudienceSegment
    .findMany({
      where: { userId: viewerId },
      select: {
        userId: true,
        species: true,
        breedCode: true,
        interestTags: true,
        sizeClass: true,
        lifeStage: true,
      },
      orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    })
    .catch((error) => {
      if (!isMissingAudienceSegmentSchemaError(error)) {
        throw error;
      }
      return [];
    });

  if (viewerAudienceSignalsRaw.length > 0) {
    return viewerAudienceSignalsRaw.map((signal) =>
      mapToPetSignal({
        userId: signal.userId,
        species: String(signal.species),
        breedCode: signal.breedCode,
        breedLabel: extractAudienceSegmentBreedLabel(
          Array.isArray(signal.interestTags) ? signal.interestTags : [],
        ),
        sizeClass: signal.sizeClass ? String(signal.sizeClass) : null,
        lifeStage: signal.lifeStage ? String(signal.lifeStage) : null,
      }),
    );
  }

  const viewerPetsRaw = await prisma.pet.findMany({
    where: { userId: viewerId },
    select: {
      userId: true,
      species: true,
      breedCode: true,
      breedLabel: true,
      sizeClass: true,
      lifeStage: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return viewerPetsRaw.map((pet) =>
    mapToPetSignal({
      userId: pet.userId,
      species: String(pet.species),
      breedCode: pet.breedCode,
      breedLabel: pet.breedLabel,
      sizeClass: String(pet.sizeClass),
      lifeStage: String(pet.lifeStage),
    }),
  );
}

async function listViewerPersonalizationContext(
  viewerId: string,
): Promise<ViewerPersonalizationContext> {
  const [petSignals, preferredPetTypeIds] = await Promise.all([
    listViewerPetSignals(viewerId),
    listPreferredPetTypeIdsByUserId(viewerId),
  ]);
  const normalizedPreferredPetTypeIds = Array.from(
    new Set(
      preferredPetTypeIds.filter(
        (petTypeId): petTypeId is string =>
          typeof petTypeId === "string" && petTypeId.length > 0,
      ),
    ),
  );
  const preferredCommunities =
    normalizedPreferredPetTypeIds.length > 0
      ? await prisma.community
          .findMany({
            where: {
              id: { in: normalizedPreferredPetTypeIds },
              isActive: true,
            },
            select: {
              tags: true,
            },
          })
          .catch((error) => {
            if (isMissingCommunityBoardSchemaError(error)) {
              return [];
            }
            throw error;
          })
      : [];

  return {
    petSignals,
    preferredPetTypeIds: normalizedPreferredPetTypeIds,
    preferredInterestLabels: dedupeInterestLabels(
      preferredCommunities.flatMap((community) =>
        community.tags.map((tag) => normalizeInterestLabel(tag)),
      ),
    ),
  };
}

async function applyPetPersonalization<T extends FeedLikePost>(
  items: T[],
  viewerId: string,
) {
  if (items.length < 2) {
    return items;
  }

  const viewerContext = await listViewerPersonalizationContext(viewerId);
  if (
    viewerContext.petSignals.length === 0 &&
    viewerContext.preferredPetTypeIds.length === 0 &&
    viewerContext.preferredInterestLabels.length === 0
  ) {
    return items;
  }

  const authorPetByUserId = new Map<string, PetSignal[]>();
  if (viewerContext.petSignals.length > 0) {
    const authorIds = Array.from(new Set(items.map((item) => item.author.id)));
    if (authorIds.length > 0) {
      const authorPetSignalsRaw = await prisma.pet.findMany({
        where: {
          userId: { in: authorIds },
        },
        select: {
          userId: true,
          species: true,
          breedCode: true,
          breedLabel: true,
          sizeClass: true,
          lifeStage: true,
        },
      });
      const authorPetSignals: PetSignal[] = authorPetSignalsRaw.map((pet) =>
        mapToPetSignal({
          userId: pet.userId,
          species: String(pet.species),
          breedCode: pet.breedCode,
          breedLabel: pet.breedLabel,
          sizeClass: String(pet.sizeClass),
          lifeStage: String(pet.lifeStage),
        }),
      );

      for (const pet of authorPetSignals) {
        const list = authorPetByUserId.get(pet.userId);
        if (list) {
          list.push(pet);
          continue;
        }
        authorPetByUserId.set(pet.userId, [pet]);
      }
    }
  }

  const scored = items
    .map((item) => {
      const boost = calculateViewerPersonalizationBoost(
        item,
        viewerContext,
        authorPetByUserId,
      );

      return {
        item,
        boost,
        score: calculateFeedScore(item, viewerContext, authorPetByUserId),
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
  const shouldCache = !viewerId;
  const runGetPost = async () => {
    const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
    const visibilityFilter =
      hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {};

    if (!supportsPostReactionsField()) {
      const post = await prisma.post
        .findFirst({
          where: { id, ...visibilityFilter },
          include: buildPostDetailBaseIncludeWithoutReactions(),
        })
        .catch(async (error) => {
          if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
            throw error;
          }

          if (isUnknownGuestAuthorIncludeError(error)) {
            return prisma.post.findFirst({
              where: { id, ...visibilityFilter },
              include: buildPostDetailBaseIncludeWithoutReactions(false),
            });
          }

          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            select: buildLegacyPostDetailSelectWithoutReactions(),
          });
        });
      return attachPostDetailExtras(withEmptyGuestPostMetaOne(post));
    }

    try {
      const post = await prisma.post
        .findFirst({
          where: { id, ...visibilityFilter },
          include: buildPostDetailBaseInclude(supportsPostGuestAuthorField()),
        })
        .catch(async (error) => {
          if (!isUnknownGuestPostColumnError(error) && !isUnknownGuestAuthorIncludeError(error)) {
            throw error;
          }

          if (isUnknownGuestAuthorIncludeError(error)) {
            return prisma.post.findFirst({
              where: { id, ...visibilityFilter },
              include: buildPostDetailBaseInclude(false),
            });
          }

          const post = await prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            select: buildLegacyPostDetailSelect(),
          });
          return withEmptyGuestPostMetaOne(post);
        });
      return attachPostDetailExtras(post);
    } catch (error) {
      if (
        !isUnavailableReactionsIncludeError(error) &&
        !isUnknownGuestPostColumnError(error) &&
        !isUnknownGuestAuthorIncludeError(error)
      ) {
        throw error;
      }

      if (isUnavailableReactionsIncludeError(error)) {
        postReactionsFieldSupport = false;
      }

      const post = await prisma.post
        .findFirst({
          where: { id, ...visibilityFilter },
          include: buildPostDetailBaseIncludeWithoutReactions(!isUnknownGuestAuthorIncludeError(error)),
        })
        .catch(async (innerError) => {
          if (!isUnknownGuestPostColumnError(innerError) && !isUnknownGuestAuthorIncludeError(innerError)) {
            throw innerError;
          }

          if (isUnknownGuestAuthorIncludeError(innerError)) {
            return prisma.post.findFirst({
              where: { id, ...visibilityFilter },
              include: buildPostDetailBaseIncludeWithoutReactions(false),
            });
          }

          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            select: buildLegacyPostDetailSelectWithoutReactions(),
          });
        });
      return attachPostDetailExtras(withEmptyGuestPostMetaOne(post));
    }
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runGetPost,
    });
  }

  return runGetPost();
}

export async function getPostMetadataById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runMetadata = async () => {
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
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id, mode: "meta" });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runMetadata,
    });
  }

  return runMetadata();
}

export async function getPostStatsById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runStats = async () => {
    const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
    const visibilityFilter =
      hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {};

    return prisma.post.findFirst({
      where: { id, ...visibilityFilter },
      select: {
        id: true,
        authorId: true,
        type: true,
        scope: true,
        status: true,
        neighborhoodId: true,
        likeCount: true,
        dislikeCount: true,
        commentCount: true,
        viewCount: true,
      },
    });
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id, mode: "stats" });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 60,
      fetcher: runStats,
    });
  }

  return runStats();
}

export async function getPostReadAccessById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runReadAccess = async () => {
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
        neighborhoodId: true,
      },
    });
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id, mode: "read-access" });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 60,
      fetcher: runReadAccess,
    });
  }

  return runReadAccess();
}

export async function getPostContentById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runContent = async () => {
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
        content: true,
      },
    });
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id, mode: "content" });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 60,
      fetcher: runContent,
    });
  }

  return runContent();
}

export async function listPosts({
  cursor,
  limit: _limit,
  page,
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
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

  const runListPosts = async () => {
    const includeViewerReactions = Boolean(viewerId);
    const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
    const resolvedSort = sort ?? DEFAULT_POST_LIST_SORT;
    const reviewCategorySupported = supportsPostReviewCategoryField();
    const effectiveType = reviewCategorySupported
      ? type
      : toLegacyReviewTypeFallback(type, reviewCategory);
    const effectiveReviewBoard = reviewCategorySupported ? reviewBoard : false;
    const effectiveReviewCategory = reviewCategorySupported ? reviewCategory : undefined;
    const where = buildPostListWhere({
      type: effectiveType,
      reviewBoard: effectiveReviewBoard,
      reviewCategory: effectiveReviewCategory,
      scope,
      petTypeId,
      petTypeIds,
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

    const legacyCompatibleWhere = buildPostListWhere({
      type: effectiveType,
      reviewBoard: effectiveReviewBoard,
      reviewCategory: effectiveReviewCategory,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
      days,
      authorBreedCode,
    });

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
          if (
            !isUnknownGuestPostColumnError(error) &&
            !isUnknownGuestAuthorIncludeError(error) &&
             !isMissingCommunityBoardSchemaError(error) &&
             !isUnsupportedReviewCategoryFilterError(error)
           ) {
             throw error;
           }

           if (isUnsupportedReviewCategoryFilterError(error)) {
             postReviewCategoryFieldSupport = false;
           }

           const safeBaseArgs = isMissingCommunityBoardSchemaError(error)
             ? { ...baseArgs, where: legacyCompatibleWhere }
             : baseArgs;

           const safeFallbackBaseArgs = isUnsupportedReviewCategoryFilterError(error)
             ? {
                 ...safeBaseArgs,
                 where: buildPostListWhere({
                   type: toLegacyReviewTypeFallback(type, reviewCategory),
                   reviewBoard: false,
                   reviewCategory: undefined,
                  scope,
                  petTypeId,
                  petTypeIds,
                   q,
                   searchIn: resolvedSearchIn,
                   excludeTypes: normalizedExcludeTypes,
                   neighborhoodId,
                   hiddenAuthorIds,
                   days,
                   authorBreedCode,
                 }),
               }
             : safeBaseArgs;

           if (isUnknownGuestAuthorIncludeError(error)) {
             return prisma.post.findMany({
               ...safeFallbackBaseArgs,
               include: buildPostListIncludeWithoutReactions(false),
             });
           }

           return prisma.post.findMany({
             ...safeFallbackBaseArgs,
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
        include: includeViewerReactions
          ? buildPostListInclude(viewerId)
          : buildPostListIncludeWithoutReactions(),
      })
      .then((rows) => (includeViewerReactions ? rows : withEmptyReactions(rows)))
      .catch(async (error) => {
        if (
          !isUnavailableReactionsIncludeError(error) &&
          !isUnknownGuestPostColumnError(error) &&
          !isUnknownGuestAuthorIncludeError(error) &&
           !isMissingCommunityBoardSchemaError(error) &&
           !isUnsupportedReviewCategoryFilterError(error)
         ) {
           throw error;
         }

        if (isUnavailableReactionsIncludeError(error)) {
          postReactionsFieldSupport = false;
        }

        if (isUnsupportedReviewCategoryFilterError(error)) {
          postReviewCategoryFieldSupport = false;
        }

        const safeBaseArgs = isMissingCommunityBoardSchemaError(error)
          ? { ...baseArgs, where: legacyCompatibleWhere }
          : baseArgs;

        const safeFallbackBaseArgs = isUnsupportedReviewCategoryFilterError(error)
          ? {
              ...safeBaseArgs,
              where: buildPostListWhere({
                type: toLegacyReviewTypeFallback(type, reviewCategory),
                reviewBoard: false,
                reviewCategory: undefined,
                scope,
                petTypeId,
                petTypeIds,
                q,
                searchIn: resolvedSearchIn,
                excludeTypes: normalizedExcludeTypes,
                neighborhoodId,
                hiddenAuthorIds,
                days,
                authorBreedCode,
              }),
            }
          : safeBaseArgs;

        if (isUnknownGuestAuthorIncludeError(error)) {
          const rows = await prisma.post.findMany({
            ...safeFallbackBaseArgs,
            include: includeViewerReactions
              ? buildPostListInclude(viewerId, false)
              : buildPostListIncludeWithoutReactions(false),
          });
          return includeViewerReactions ? rows : withEmptyReactions(rows);
        }

        if (
          isUnknownGuestPostColumnError(error) ||
          isMissingCommunityBoardSchemaError(error) ||
          isUnsupportedReviewCategoryFilterError(error)
        ) {
          const legacyItems = await prisma.post.findMany({
            ...safeFallbackBaseArgs,
            select: includeViewerReactions
              ? buildLegacyPostListSelect(viewerId)
              : buildLegacyPostListSelectWithoutReactions(),
          });
          return includeViewerReactions
            ? withEmptyGuestPostMeta(legacyItems)
            : withEmptyReactions(withEmptyGuestPostMeta(legacyItems));
        }

        const fallbackItems = await prisma.post
          .findMany({
            ...safeBaseArgs,
            include: buildPostListIncludeWithoutReactions(),
          })
          .catch(async (innerError) => {
            if (
              !isUnknownGuestPostColumnError(innerError) &&
              !isUnknownGuestAuthorIncludeError(innerError) &&
                !isMissingCommunityBoardSchemaError(innerError) &&
                !isUnsupportedReviewCategoryFilterError(innerError)
              ) {
                throw innerError;
              }

              if (isUnsupportedReviewCategoryFilterError(innerError)) {
                postReviewCategoryFieldSupport = false;
              }

              const safeInnerBaseArgs = isMissingCommunityBoardSchemaError(innerError)
                ? { ...baseArgs, where: legacyCompatibleWhere }
                : safeBaseArgs;

              const safeInnerFallbackArgs = isUnsupportedReviewCategoryFilterError(innerError)
                ? {
                    ...safeInnerBaseArgs,
                    where: buildPostListWhere({
                      type: toLegacyReviewTypeFallback(type, reviewCategory),
                      reviewBoard: false,
                      reviewCategory: undefined,
                      scope,
                      petTypeId,
                      petTypeIds,
                      q,
                      searchIn: resolvedSearchIn,
                      excludeTypes: normalizedExcludeTypes,
                      neighborhoodId,
                      hiddenAuthorIds,
                      days,
                      authorBreedCode,
                    }),
                  }
                : safeInnerBaseArgs;

              if (isUnknownGuestAuthorIncludeError(innerError)) {
                return prisma.post.findMany({
                  ...safeInnerFallbackArgs,
                  include: buildPostListIncludeWithoutReactions(false),
                });
              }

              return prisma.post.findMany({
                ...safeInnerFallbackArgs,
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
      const personalizedItems = (await applyPetPersonalization(
        items as Array<FeedLikePost & (typeof items)[number]>,
        viewerId,
      )) as typeof items;
      return {
        items: personalizedItems,
        nextCursor,
      };
    }

    return { items, nextCursor };
  };

  const normalizedAuthorBreedCode = normalizeBreedCode(authorBreedCode);
  const shouldCache = !personalized && !cursor && resolvedPage === 1;

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("feed", {
      scope,
      type: type ?? "ALL",
      reviewBoard: reviewBoard ? "1" : "0",
      reviewCategory: reviewCategory ?? "ALL",
      petTypeId: petTypeId ?? "ALL",
      petTypeIds: petTypeIds?.join(",") ?? "",
      q: q?.trim() ?? "",
      searchIn: searchIn ?? DEFAULT_POST_SEARCH_IN,
      sort: sort ?? DEFAULT_POST_LIST_SORT,
      days: days ?? "",
      excludeTypes: normalizedExcludeTypes,
      limit: resolvedLimit,
      page: resolvedPage,
      authorBreedCode: normalizedAuthorBreedCode ?? "",
      neighborhoodId: neighborhoodId ?? "",
      viewerId: viewerId ?? "guest",
      hiddenAuthorIds,
    });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runListPosts,
    });
  }

  return runListPosts();
}

export async function listBestPosts({
  limit: _limit,
  page,
  days,
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
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

  const runListBestPosts = async () => {
    const includeViewerReactions = Boolean(viewerId);
    const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
    const reviewCategorySupported = supportsPostReviewCategoryField();
    const effectiveType = reviewCategorySupported
      ? type
      : toLegacyReviewTypeFallback(type, reviewCategory);
    const effectiveReviewBoard = reviewCategorySupported ? reviewBoard : false;
    const effectiveReviewCategory = reviewCategorySupported ? reviewCategory : undefined;
    const where = buildBestPostWhere({
      days,
      minLikes,
      type: effectiveType,
      reviewBoard: effectiveReviewBoard,
      reviewCategory: effectiveReviewCategory,
      scope,
      petTypeId,
      petTypeIds,
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

    const legacyCompatibleWhere = buildBestPostWhere({
      days,
      minLikes,
      type: effectiveType,
      reviewBoard: effectiveReviewBoard,
      reviewCategory: effectiveReviewCategory,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    });

    if (!supportsPostReactionsField()) {
      const fallbackItems = await prisma.post
        .findMany({
          ...baseArgs,
          include: buildPostListIncludeWithoutReactions(),
        })
        .catch(async (error) => {
          if (
            !isUnknownGuestPostColumnError(error) &&
            !isUnknownGuestAuthorIncludeError(error) &&
             !isMissingCommunityBoardSchemaError(error) &&
             !isUnsupportedReviewCategoryFilterError(error)
           ) {
             throw error;
           }

           if (isUnsupportedReviewCategoryFilterError(error)) {
             postReviewCategoryFieldSupport = false;
           }

           const safeBaseArgs = isMissingCommunityBoardSchemaError(error)
             ? { ...baseArgs, where: legacyCompatibleWhere }
             : baseArgs;

           const safeFallbackBaseArgs = isUnsupportedReviewCategoryFilterError(error)
             ? {
                 ...safeBaseArgs,
                 where: buildBestPostWhere({
                   days,
                   minLikes,
                   type: toLegacyReviewTypeFallback(type, reviewCategory),
                   reviewBoard: false,
                   reviewCategory: undefined,
                   scope,
                   petTypeId,
                   petTypeIds,
                   q,
                   searchIn: resolvedSearchIn,
                   excludeTypes: normalizedExcludeTypes,
                   neighborhoodId,
                   hiddenAuthorIds,
                 }),
               }
             : safeBaseArgs;

           if (isUnknownGuestAuthorIncludeError(error)) {
             return prisma.post.findMany({
               ...safeFallbackBaseArgs,
               include: buildPostListIncludeWithoutReactions(false),
             });
           }

           return prisma.post.findMany({
             ...safeFallbackBaseArgs,
             select: buildLegacyPostListSelectWithoutReactions(),
           });
         });
      return withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
    }

    const items = await prisma.post
      .findMany({
        ...baseArgs,
        include: includeViewerReactions
          ? buildPostListInclude(viewerId)
          : buildPostListIncludeWithoutReactions(),
      })
      .then((rows) => (includeViewerReactions ? rows : withEmptyReactions(rows)))
      .catch(async (error) => {
        if (
          !isUnavailableReactionsIncludeError(error) &&
          !isUnknownGuestPostColumnError(error) &&
          !isUnknownGuestAuthorIncludeError(error) &&
            !isMissingCommunityBoardSchemaError(error) &&
            !isUnsupportedReviewCategoryFilterError(error)
          ) {
            throw error;
          }

        if (isUnavailableReactionsIncludeError(error)) {
          postReactionsFieldSupport = false;
        }

        if (isUnsupportedReviewCategoryFilterError(error)) {
          postReviewCategoryFieldSupport = false;
        }

        const safeBaseArgs = isMissingCommunityBoardSchemaError(error)
          ? { ...baseArgs, where: legacyCompatibleWhere }
          : baseArgs;

        const safeFallbackBaseArgs = isUnsupportedReviewCategoryFilterError(error)
          ? {
              ...safeBaseArgs,
              where: buildBestPostWhere({
                days,
                minLikes,
                type: toLegacyReviewTypeFallback(type, reviewCategory),
                reviewBoard: false,
                reviewCategory: undefined,
                scope,
                petTypeId,
                petTypeIds,
                q,
                searchIn: resolvedSearchIn,
                excludeTypes: normalizedExcludeTypes,
                neighborhoodId,
                hiddenAuthorIds,
              }),
            }
          : safeBaseArgs;

        if (isUnknownGuestAuthorIncludeError(error)) {
          const rows = await prisma.post.findMany({
            ...safeFallbackBaseArgs,
            include: includeViewerReactions
              ? buildPostListInclude(viewerId, false)
              : buildPostListIncludeWithoutReactions(false),
          });
          return includeViewerReactions ? rows : withEmptyReactions(rows);
        }

        if (
          isUnknownGuestPostColumnError(error) ||
          isMissingCommunityBoardSchemaError(error) ||
          isUnsupportedReviewCategoryFilterError(error)
        ) {
          const legacyItems = await prisma.post.findMany({
            ...safeFallbackBaseArgs,
            select: includeViewerReactions
              ? buildLegacyPostListSelect(viewerId)
              : buildLegacyPostListSelectWithoutReactions(),
          });
          return includeViewerReactions
            ? withEmptyGuestPostMeta(legacyItems)
            : withEmptyReactions(withEmptyGuestPostMeta(legacyItems));
        }

        const fallbackItems = await prisma.post
          .findMany({
            ...safeBaseArgs,
            include: buildPostListIncludeWithoutReactions(),
          })
          .catch(async (innerError) => {
            if (
              !isUnknownGuestPostColumnError(innerError) &&
              !isUnknownGuestAuthorIncludeError(innerError) &&
                !isMissingCommunityBoardSchemaError(innerError) &&
                !isUnsupportedReviewCategoryFilterError(innerError)
              ) {
                throw innerError;
              }

              if (isUnsupportedReviewCategoryFilterError(innerError)) {
                postReviewCategoryFieldSupport = false;
              }

              const safeInnerBaseArgs = isMissingCommunityBoardSchemaError(innerError)
                ? { ...baseArgs, where: legacyCompatibleWhere }
                : safeBaseArgs;

              const safeInnerFallbackArgs = isUnsupportedReviewCategoryFilterError(innerError)
                ? {
                    ...safeInnerBaseArgs,
                    where: buildBestPostWhere({
                      days,
                      minLikes,
                      type: toLegacyReviewTypeFallback(type, reviewCategory),
                      reviewBoard: false,
                      reviewCategory: undefined,
                      scope,
                      petTypeId,
                      petTypeIds,
                      q,
                      searchIn: resolvedSearchIn,
                      excludeTypes: normalizedExcludeTypes,
                      neighborhoodId,
                      hiddenAuthorIds,
                    }),
                  }
                : safeInnerBaseArgs;

              if (isUnknownGuestAuthorIncludeError(innerError)) {
                return prisma.post.findMany({
                  ...safeInnerFallbackArgs,
                  include: buildPostListIncludeWithoutReactions(false),
                });
              }

              return prisma.post.findMany({
                ...safeInnerFallbackArgs,
                select: buildLegacyPostListSelectWithoutReactions(),
              });
            });
        return withEmptyReactions(withEmptyGuestPostMeta(fallbackItems));
      });
    return items;
  };

  const shouldCache = true;
  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("feed", {
      scope,
      type: type ?? "ALL",
      reviewBoard: reviewBoard ? "1" : "0",
      reviewCategory: reviewCategory ?? "ALL",
      petTypeId: petTypeId ?? "ALL",
      petTypeIds: petTypeIds?.join(",") ?? "",
      q: q?.trim() ?? "",
      searchIn: searchIn ?? DEFAULT_POST_SEARCH_IN,
      days,
      excludeTypes: normalizedExcludeTypes,
      limit: resolvedLimit,
      page: resolvedPage,
      minLikes,
      neighborhoodId: neighborhoodId ?? "",
      viewerId: viewerId ?? "guest",
      hiddenAuthorIds,
    });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runListBestPosts,
    });
  }

  return runListBestPosts();
}

export async function countPosts({
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
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
  const reviewCategorySupported = supportsPostReviewCategoryField();
  const effectiveType = reviewCategorySupported
    ? type
    : toLegacyReviewTypeFallback(type, reviewCategory);
  const effectiveReviewBoard = reviewCategorySupported ? reviewBoard : false;
  const effectiveReviewCategory = reviewCategorySupported ? reviewCategory : undefined;
  const where = buildPostListWhere({
    type: effectiveType,
    reviewBoard: effectiveReviewBoard,
    reviewCategory: effectiveReviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    days,
  });

  return prisma.post.count({ where }).catch((error) => {
    if (!isMissingCommunityBoardSchemaError(error) && !isUnsupportedReviewCategoryFilterError(error)) {
      throw error;
    }

    if (isUnsupportedReviewCategoryFilterError(error)) {
      postReviewCategoryFieldSupport = false;
    }

    const legacyWhere = buildPostListWhere({
      type: toLegacyReviewTypeFallback(type, reviewCategory),
      reviewBoard: false,
      reviewCategory: undefined,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
      days,
    });

    return prisma.post.count({ where: legacyWhere });
  });
}

export async function countBestPosts({
  days,
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
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
  const reviewCategorySupported = supportsPostReviewCategoryField();
  const effectiveType = reviewCategorySupported
    ? type
    : toLegacyReviewTypeFallback(type, reviewCategory);
  const effectiveReviewBoard = reviewCategorySupported ? reviewBoard : false;
  const effectiveReviewCategory = reviewCategorySupported ? reviewCategory : undefined;
  const where = buildBestPostWhere({
    days,
    minLikes,
    type: effectiveType,
    reviewBoard: effectiveReviewBoard,
    reviewCategory: effectiveReviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  });

  return prisma.post.count({ where }).catch((error) => {
    if (!isMissingCommunityBoardSchemaError(error) && !isUnsupportedReviewCategoryFilterError(error)) {
      throw error;
    }

    if (isUnsupportedReviewCategoryFilterError(error)) {
      postReviewCategoryFieldSupport = false;
    }

    const legacyWhere = buildBestPostWhere({
      days,
      minLikes,
      type: toLegacyReviewTypeFallback(type, reviewCategory),
      reviewBoard: false,
      reviewCategory: undefined,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    });

    return prisma.post.count({ where: legacyWhere });
  });
}

type UserPostListOptions = {
  authorId: string;
  scope?: PostScope;
  type?: PostType;
  q?: string;
};

type UserPostPageOptions = UserPostListOptions & {
  limit: number;
  page: number;
};

function buildUserPostWhere({ authorId, scope, type, q }: UserPostListOptions): Prisma.PostWhereInput {
  const equivalentTypes = type ? getEquivalentPostTypes(type) : null;

  return {
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
  };
}

export async function countUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.count({
    where: buildUserPostWhere({ authorId, scope, type, q }),
  });
}

export async function listUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.findMany({
    where: buildUserPostWhere({ authorId, scope, type, q }),
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

export async function listUserPostsPage({
  authorId,
  scope,
  type,
  q,
  limit,
  page,
}: UserPostPageOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const rows = await prisma.post.findMany({
    where: buildUserPostWhere({ authorId, scope, type, q }),
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * safeLimit,
    take: safeLimit + 1,
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      content: true,
      commentCount: true,
      likeCount: true,
      viewCount: true,
      createdAt: true,
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      images: {
        select: { id: true },
      },
    },
  });

  const hasNext = rows.length > safeLimit;
  const items = hasNext ? rows.slice(0, safeLimit) : rows;
  return {
    items,
    hasNext,
  };
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
  const queryLength = trimmedQuery.length;
  const candidateMultiplier = queryLength <= 2 ? 2 : 3;
  const maxCandidates = queryLength <= 2 ? 80 : 120;
  const candidateLimit = Math.min(
    Math.max(safeLimit * candidateMultiplier, safeLimit),
    maxCandidates,
  );
  const trigramScoreSql = useTrigram
    ? Prisma.sql`+ GREATEST(
          similarity(COALESCE(p."title", ''), ${trimmedQuery}),
          similarity(COALESCE(p."content", ''), ${trimmedQuery}),
          similarity(COALESCE(u."nickname", ''), ${trimmedQuery}),
          similarity(COALESCE(u."name", ''), ${trimmedQuery})
        ) * 4.0`
    : Prisma.sql``;

  const runRankedSearch = async () => {
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

    const includeViewerReactions = Boolean(viewerId);
    const fetchedPosts = !supportsPostReactionsField() || !includeViewerReactions
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
            if (!isUnavailableReactionsIncludeError(error) && !isUnknownGuestAuthorIncludeError(error)) {
              throw error;
            }

            if (isUnavailableReactionsIncludeError(error)) {
              postReactionsFieldSupport = false;
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
  };

  const shouldCache = true;
  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("search", {
      scope,
      type: type ?? "ALL",
      q: trimmedQuery,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      limit: safeLimit,
      neighborhoodId: neighborhoodId ?? "",
      viewerId: viewerId ?? "guest",
      hiddenAuthorIds,
    });
    try {
      return await withQueryCache({
        key: cacheKey,
        ttlSeconds: 45,
        fetcher: runRankedSearch,
      });
    } catch (error) {
      logger.warn("검색 캐시 실패로 원본 검색을 사용합니다.", {
        query: trimmedQuery,
        searchIn: resolvedSearchIn,
        error: serializeError(error),
      });
    }
  }

  try {
    return await runRankedSearch();
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

  const runSuggestions = async () =>
    prisma.post.findMany({
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

  const shouldCache = true;
  const rows = shouldCache
    ? await withQueryCache({
        key: await createQueryCacheKey("suggest", {
          scope,
          type: type ?? "ALL",
          q: trimmedQuery,
          searchIn: resolvedSearchIn,
          excludeTypes: normalizedExcludeTypes,
          limit,
          neighborhoodId: neighborhoodId ?? "",
          viewerId: viewerId ?? "guest",
          hiddenAuthorIds,
        }),
        ttlSeconds: 60,
        fetcher: runSuggestions,
      })
    : await runSuggestions();

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
