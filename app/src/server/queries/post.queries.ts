import {
  FeedPersonalizationEvent,
  PostReactionType,
  PostScope,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";

import {
  DEFAULT_BREED_CATALOG,
} from "@/lib/breed-catalog";
import type { FeedPersonalizationPolicy } from "@/lib/feed-personalization-policy";
import {
  extractAudienceSegmentBreedLabel,
  getPetBreedDisplayLabel,
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
import { getFeedPersonalizationPolicy } from "@/server/queries/policy.queries";
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
let postBookmarksFieldSupport: boolean | null = null;
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
    author: { select: { id: true, nickname: true, image: true } },
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
  }) as const;

const buildPostListIncludeWithoutReactions = (
  includeGuestAuthor = supportsPostGuestAuthorField(),
) =>
  ({
    author: { select: { id: true, nickname: true, image: true } },
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

const ADOPTION_LISTING_SELECT = {
  shelterName: true,
  region: true,
  animalType: true,
  breed: true,
  ageLabel: true,
  sex: true,
  isNeutered: true,
  isVaccinated: true,
  sizeLabel: true,
  status: true,
} as const;

const VOLUNTEER_RECRUITMENT_SELECT = {
  shelterName: true,
  region: true,
  volunteerDate: true,
  volunteerType: true,
  capacity: true,
  status: true,
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
  adoptionListing: {
    shelterName: string | null;
    region: string | null;
    animalType: string | null;
    breed: string | null;
    ageLabel: string | null;
    sex: string | null;
    isNeutered: boolean | null;
    isVaccinated: boolean | null;
    sizeLabel: string | null;
    status: string | null;
  } | null;
  volunteerRecruitment: {
    shelterName: string | null;
    region: string | null;
    volunteerDate: Date | null;
    volunteerType: string | null;
    capacity: number | null;
    status: string | null;
  } | null;
};

const buildPostDetailBaseInclude = (includeGuestAuthor = supportsPostGuestAuthorField()) =>
  ({
    author: { select: { id: true, nickname: true } },
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
    author: { select: { id: true, nickname: true } },
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
  const needsAdoption = post.type === PostType.ADOPTION_LISTING;
  const needsVolunteer = post.type === PostType.SHELTER_VOLUNTEER;
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

  if (needsAdoption) {
    if (target.adoptionListing === undefined) {
      tasks.push(
        prisma.adoptionListing
          .findUnique({ where: { postId: post.id }, select: ADOPTION_LISTING_SELECT })
          .then((listing) => {
            target.adoptionListing = listing;
          }),
      );
    }
  } else if (target.adoptionListing === undefined) {
    target.adoptionListing = null;
  }

  if (needsVolunteer) {
    if (target.volunteerRecruitment === undefined) {
      tasks.push(
        prisma.volunteerRecruitment
          .findUnique({ where: { postId: post.id }, select: VOLUNTEER_RECRUITMENT_SELECT })
          .then((recruitment) => {
            target.volunteerRecruitment = recruitment;
          }),
      );
    }
  } else if (target.volunteerRecruitment === undefined) {
    target.volunteerRecruitment = null;
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
  author: { select: { id: true, nickname: true } },
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
    author: { select: { id: true, nickname: true, image: true } },
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
    author: { select: { id: true, nickname: true, image: true } },
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

function isMissingPostBookmarkTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    if (tableName.includes("PostBookmark")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("PostBookmark") &&
    error.message.includes("does not exist")
  );
}

function isMissingFeedPersonalizationEventLogSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("FeedPersonalizationEventLog") ||
      columnName.includes("FeedPersonalizationEventLog")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("FeedPersonalizationEventLog") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
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

function supportsPostBookmarksField() {
  if (postBookmarksFieldSupport !== null) {
    return postBookmarksFieldSupport;
  }

  postBookmarksFieldSupport = Boolean(
    (
      prisma as typeof prisma & {
        postBookmark?: {
          findMany: (typeof prisma.postBookmark)["findMany"];
        };
      }
    ).postBookmark,
  );
  return postBookmarksFieldSupport;
}

function supportsFeedPersonalizationEventLogField() {
  return Boolean(
    (
      prisma as typeof prisma & {
        feedPersonalizationEventLog?: {
          findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
        };
      }
    ).feedPersonalizationEventLog,
  );
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

function withBookmarkStateOne<T extends { id: string }>(
  item: T | null,
  bookmarkedPostIds: Set<string>,
): (T & { isBookmarked: boolean }) | null {
  if (!item) {
    return null;
  }

  return {
    ...item,
    isBookmarked: bookmarkedPostIds.has(item.id),
  };
}

function withBookmarkState<T extends { id: string }>(
  items: T[],
  bookmarkedPostIds: Set<string>,
): Array<T & { isBookmarked: boolean }> {
  return items.map((item) => ({
    ...item,
    isBookmarked: bookmarkedPostIds.has(item.id),
  }));
}

async function getBookmarkedPostIdSet(postIds: string[], viewerId?: string) {
  if (!viewerId || postIds.length === 0 || !supportsPostBookmarksField()) {
    return new Set<string>();
  }

  const delegate = (
    prisma as typeof prisma & {
      postBookmark?: {
        findMany: (typeof prisma.postBookmark)["findMany"];
      };
    }
  ).postBookmark;

  if (!delegate) {
    postBookmarksFieldSupport = false;
    return new Set<string>();
  }

  try {
    const bookmarks = await delegate.findMany({
      where: {
        userId: viewerId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });
    return new Set(bookmarks.map((bookmark) => bookmark.postId));
  } catch (error) {
    if (!isMissingPostBookmarkTableError(error)) {
      throw error;
    }
    postBookmarksFieldSupport = false;
    return new Set<string>();
  }
}

async function attachBookmarkStateToPosts<T extends { id: string }>(
  items: T[],
  viewerId?: string,
) {
  const bookmarkedPostIds = await getBookmarkedPostIdSet(
    Array.from(new Set(items.map((item) => item.id))),
    viewerId,
  );
  return withBookmarkState(items, bookmarkedPostIds);
}

async function attachBookmarkStateToPost<T extends { id: string }>(
  item: T | null,
  viewerId?: string,
) {
  const bookmarkedPostIds = await getBookmarkedPostIdSet(item ? [item.id] : [], viewerId);
  return withBookmarkStateOne(item, bookmarkedPostIds);
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
      nickname: { contains: trimmedQuery, mode: "insensitive" as const },
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

type PostInterestLike = Pick<
  FeedLikePost,
  "petTypeId" | "type" | "reviewCategory" | "animalTags" | "petType"
>;

type FeedPersonalizationEventLogLike = {
  event: FeedPersonalizationEvent;
  audienceKey: string;
  breedCode: string;
  post: PostInterestLike | null;
};

type ViewerPersonalizationContext = {
  policy: FeedPersonalizationPolicy;
  petSignals: PetSignal[];
  preferredPetTypeIds: string[];
  preferredInterestLabels: string[];
  recentEngagementPetTypeIds: string[];
  recentNegativePetTypeIds: string[];
  recentEngagementInterestLabels: string[];
  recentNegativeInterestLabels: string[];
  recentClickPetTypeWeights: Record<string, number>;
  recentClickInterestWeights: Record<string, number>;
  recentAdBreedWeights: Record<string, number>;
  recentAdAudienceKeyWeights: Record<string, number>;
  recentDwellPetTypeWeights: Record<string, number>;
  recentDwellInterestWeights: Record<string, number>;
  recentBookmarkPetTypeWeights: Record<string, number>;
  recentBookmarkInterestWeights: Record<string, number>;
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
  ADOPTION_LISTING: ["입양", "보호소"],
  SHELTER_VOLUNTEER: ["봉사", "보호소"],
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

function normalizeAudienceKey(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
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

function buildFallbackAudienceKey(input: {
  species: string | null | undefined;
  sizeClass?: string | null;
  lifeStage?: string | null;
}) {
  if (!input.species) {
    return null;
  }

  const parts = [String(input.species)];
  if (input.sizeClass && input.sizeClass !== "UNKNOWN") {
    parts.push(String(input.sizeClass));
  }
  if (input.lifeStage && input.lifeStage !== "UNKNOWN") {
    parts.push(String(input.lifeStage));
  }
  return parts.join(":");
}

function getRecencyWeight(index: number, policy: FeedPersonalizationPolicy) {
  return Math.max(policy.recencyDecayFloor, 1 - index * policy.recencyDecayStep);
}

function addWeightedDimension(
  target: Record<string, number>,
  key: string | null | undefined,
  weight: number,
) {
  if (!key || weight <= 0) {
    return;
  }

  target[key] = (target[key] ?? 0) + weight;
}

function listTopWeightedDimensions(
  values: Record<string, number>,
  limit = 3,
) {
  return Object.entries(values)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0], "ko");
    })
    .slice(0, limit)
    .map(([key]) => key);
}

function applySignalCap(baseBoost: number, multiplier: number, cap: number) {
  if (baseBoost <= 0 || multiplier <= 0 || cap <= 0) {
    return 0;
  }

  return Math.min(cap, baseBoost * multiplier);
}

function getBreedSummaryLabel(breedCode: string) {
  const catalogEntry = DEFAULT_BREED_CATALOG.find((entry) => entry.code === breedCode);
  return catalogEntry?.labelKo ?? getPetBreedDisplayLabel({ breedCode, breedLabel: null });
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

function collectPostInterestLabels(post: PostInterestLike) {
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

function buildRecentBehaviorSignal(
  logs: FeedPersonalizationEventLogLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentClickPetTypeWeights: Record<string, number> = {};
  const recentClickInterestWeights: Record<string, number> = {};
  const recentAdBreedWeights: Record<string, number> = {};
  const recentAdAudienceKeyWeights: Record<string, number> = {};
  const recentBehaviorSummaryWeights: Record<string, number> = {};

  logs.forEach((log, index) => {
    const weight = getRecencyWeight(index, policy);

    if (log.event === "POST_CLICK" && log.post) {
      addWeightedDimension(
        recentClickPetTypeWeights,
        log.post.petTypeId,
        weight,
      );
      const interestLabels = collectPostInterestLabels(log.post);
      for (const label of interestLabels) {
        addWeightedDimension(recentClickInterestWeights, label, weight);
        addWeightedDimension(recentBehaviorSummaryWeights, label, weight);
      }
      return;
    }

    if (log.event !== "AD_CLICK") {
      return;
    }

    const breedCode = normalizeBreedCode(log.breedCode);
    if (breedCode && hasBreedLoungeRoute(breedCode)) {
      addWeightedDimension(recentAdBreedWeights, breedCode, weight);
      addWeightedDimension(
        recentBehaviorSummaryWeights,
        getBreedSummaryLabel(breedCode),
        weight,
      );
    }

    const audienceKey = normalizeAudienceKey(log.audienceKey);
    if (audienceKey && audienceKey !== "NONE") {
      addWeightedDimension(recentAdAudienceKeyWeights, audienceKey, weight);
    }
  });

  return {
    recentClickPetTypeWeights,
    recentClickInterestWeights,
    recentAdBreedWeights,
    recentAdAudienceKeyWeights,
    summaryLabels: listTopWeightedDimensions(recentBehaviorSummaryWeights, 3),
  };
}

function buildRecentDwellSignal(
  logs: FeedPersonalizationEventLogLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentDwellPetTypeWeights: Record<string, number> = {};
  const recentDwellInterestWeights: Record<string, number> = {};
  const recentDwellSummaryWeights: Record<string, number> = {};

  logs.forEach((log, index) => {
    if (log.event !== FeedPersonalizationEvent.POST_DWELL || !log.post) {
      return;
    }

    const weight = getRecencyWeight(index, policy);
    addWeightedDimension(recentDwellPetTypeWeights, log.post.petTypeId, weight);

    const interestLabels = collectPostInterestLabels(log.post);
    for (const label of interestLabels) {
      addWeightedDimension(recentDwellInterestWeights, label, weight);
      addWeightedDimension(recentDwellSummaryWeights, label, weight);
    }
  });

  return {
    recentDwellPetTypeWeights,
    recentDwellInterestWeights,
    summaryLabels: listTopWeightedDimensions(recentDwellSummaryWeights, 3),
  };
}

function buildRecentBookmarkSignal(
  posts: PostInterestLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentBookmarkPetTypeWeights: Record<string, number> = {};
  const recentBookmarkInterestWeights: Record<string, number> = {};
  const recentBookmarkSummaryWeights: Record<string, number> = {};

  posts.forEach((post, index) => {
    const weight = getRecencyWeight(index, policy);
    addWeightedDimension(recentBookmarkPetTypeWeights, post.petTypeId, weight);

    const interestLabels = collectPostInterestLabels(post);
    for (const label of interestLabels) {
      addWeightedDimension(recentBookmarkInterestWeights, label, weight);
      addWeightedDimension(recentBookmarkSummaryWeights, label, weight);
    }
  });

  return {
    recentBookmarkPetTypeWeights,
    recentBookmarkInterestWeights,
    summaryLabels: listTopWeightedDimensions(recentBookmarkSummaryWeights, 3),
  };
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

function calculateRecentEngagementBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let boost = 0;

  if (post.petTypeId && viewerContext.recentEngagementPetTypeIds.includes(post.petTypeId)) {
    boost += 0.05;
  }
  if (post.petTypeId && viewerContext.recentNegativePetTypeIds.includes(post.petTypeId)) {
    boost -= 0.04;
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return boost;
  }

  const positiveInterests = new Set(viewerContext.recentEngagementInterestLabels);
  const negativeInterests = new Set(viewerContext.recentNegativeInterestLabels);
  let likedCount = 0;
  let dislikedCount = 0;
  for (const label of postInterestLabels) {
    if (positiveInterests.has(label)) {
      likedCount += 1;
    }
    if (negativeInterests.has(label)) {
      dislikedCount += 1;
    }
  }

  boost += Math.min(0.06, likedCount * 0.02);
  boost -= Math.min(0.04, dislikedCount * 0.02);
  return boost;
}

function calculateRecentBehaviorBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  let clickBoost = 0;

  if (post.petTypeId) {
    clickBoost += Math.min(
      0.045,
      (viewerContext.recentClickPetTypeWeights[post.petTypeId] ?? 0) * 0.03,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length > 0) {
    const clickInterestWeight = postInterestLabels.reduce(
      (total, label) => total + (viewerContext.recentClickInterestWeights[label] ?? 0),
      0,
    );
    clickBoost += Math.min(0.05, clickInterestWeight * 0.015);
  }

  let boost = applySignalCap(
    clickBoost,
    viewerContext.policy.clickSignalMultiplier,
    viewerContext.policy.clickSignalCap,
  );

  const authorPets = authorPetByUserId.get(post.author.id) ?? [];
  if (authorPets.length === 0) {
    return boost;
  }

  let bestBreedWeight = 0;
  let bestAudienceKeyWeight = 0;

  for (const authorPet of authorPets) {
    const authorBreedCode = normalizeBreedCode(authorPet.breedCode);
    if (authorBreedCode && hasBreedLoungeRoute(authorBreedCode)) {
      bestBreedWeight = Math.max(
        bestBreedWeight,
        viewerContext.recentAdBreedWeights[authorBreedCode] ?? 0,
      );
    }

    const fallbackAudienceKey = buildFallbackAudienceKey({
      species: authorPet.species,
      sizeClass: authorPet.sizeClass,
      lifeStage: authorPet.lifeStage,
    });
    if (fallbackAudienceKey) {
      bestAudienceKeyWeight = Math.max(
        bestAudienceKeyWeight,
        viewerContext.recentAdAudienceKeyWeights[fallbackAudienceKey] ?? 0,
      );
    }
  }

  const adBoost =
    Math.min(0.04, bestBreedWeight * 0.028) +
    Math.min(0.025, bestAudienceKeyWeight * 0.02);
  boost += applySignalCap(
    adBoost,
    viewerContext.policy.adSignalMultiplier,
    viewerContext.policy.adSignalCap,
  );
  return boost;
}

function calculateRecentDwellBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let baseBoost = 0;

  if (post.petTypeId) {
    baseBoost += Math.min(
      0.06,
      (viewerContext.recentDwellPetTypeWeights[post.petTypeId] ?? 0) * 0.038,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return applySignalCap(
      baseBoost,
      viewerContext.policy.dwellSignalMultiplier,
      viewerContext.policy.dwellSignalCap,
    );
  }

  const dwellInterestWeight = postInterestLabels.reduce(
    (total, label) => total + (viewerContext.recentDwellInterestWeights[label] ?? 0),
    0,
  );
  baseBoost += Math.min(0.07, dwellInterestWeight * 0.022);
  return applySignalCap(
    baseBoost,
    viewerContext.policy.dwellSignalMultiplier,
    viewerContext.policy.dwellSignalCap,
  );
}

function calculateRecentBookmarkBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let baseBoost = 0;

  if (post.petTypeId) {
    baseBoost += Math.min(
      0.07,
      (viewerContext.recentBookmarkPetTypeWeights[post.petTypeId] ?? 0) * 0.042,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return applySignalCap(
      baseBoost,
      viewerContext.policy.bookmarkSignalMultiplier,
      viewerContext.policy.bookmarkSignalCap,
    );
  }

  const bookmarkInterestWeight = postInterestLabels.reduce(
    (total, label) => total + (viewerContext.recentBookmarkInterestWeights[label] ?? 0),
    0,
  );
  baseBoost += Math.min(0.08, bookmarkInterestWeight * 0.024);
  return applySignalCap(
    baseBoost,
    viewerContext.policy.bookmarkSignalMultiplier,
    viewerContext.policy.bookmarkSignalCap,
  );
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
  const recentEngagementBoost = calculateRecentEngagementBoost(post, viewerContext);
  const recentBehaviorBoost = calculateRecentBehaviorBoost(
    post,
    viewerContext,
    authorPetByUserId,
  );
  const recentDwellBoost = calculateRecentDwellBoost(post, viewerContext);
  const recentBookmarkBoost = calculateRecentBookmarkBoost(post, viewerContext);

  return (
    petBoost +
    preferredPetTypeBoost +
    preferredInterestBoost +
    recentEngagementBoost +
    recentBehaviorBoost +
    recentDwellBoost +
    recentBookmarkBoost
  );
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

export async function listViewerRecentEngagementSummaryLabels(viewerId: string) {
  if (!supportsPostReactionsField()) {
    return [];
  }

  const recentReactions = await prisma.postReaction
    .findMany({
      where: {
        userId: viewerId,
        type: "LIKE",
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingPostReactionTableError(error) ||
        isUnavailableReactionsIncludeError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });

  return dedupeInterestLabels(
    recentReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
  ).slice(0, 3);
}

async function listViewerRecentBehaviorEvents(
  viewerId: string,
  take = 16,
): Promise<FeedPersonalizationEventLogLike[]> {
  if (!supportsFeedPersonalizationEventLogField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      feedPersonalizationEventLog?: {
        findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
      };
    }
  ).feedPersonalizationEventLog;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
        event: { in: ["POST_CLICK", "AD_CLICK"] },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        event: true,
        audienceKey: true,
        breedCode: true,
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingFeedPersonalizationEventLogSchemaError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentBehaviorSummaryLabels(viewerId: string) {
  const recentBehaviorEvents = await listViewerRecentBehaviorEvents(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentBehaviorSignal(recentBehaviorEvents, policy).summaryLabels;
}

async function listViewerRecentDwellEvents(
  viewerId: string,
  take = 12,
): Promise<FeedPersonalizationEventLogLike[]> {
  if (!supportsFeedPersonalizationEventLogField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      feedPersonalizationEventLog?: {
        findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
      };
    }
  ).feedPersonalizationEventLog;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
        event: FeedPersonalizationEvent.POST_DWELL,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        event: true,
        audienceKey: true,
        breedCode: true,
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingFeedPersonalizationEventLogSchemaError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentDwellSummaryLabels(viewerId: string) {
  const recentDwellEvents = await listViewerRecentDwellEvents(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentDwellSignal(recentDwellEvents, policy).summaryLabels;
}

async function listViewerRecentBookmarkedPosts(
  viewerId: string,
  take = 12,
): Promise<PostInterestLike[]> {
  if (!supportsPostBookmarksField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      postBookmark?: {
        findMany: (typeof prisma.postBookmark)["findMany"];
      };
    }
  ).postBookmark;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .then((bookmarks) =>
      bookmarks.flatMap((bookmark) =>
        bookmark.post ? [bookmark.post as PostInterestLike] : [],
      ),
    )
    .catch((error) => {
      if (
        isMissingPostBookmarkTableError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentBookmarkSummaryLabels(viewerId: string) {
  const recentBookmarks = await listViewerRecentBookmarkedPosts(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentBookmarkSignal(recentBookmarks, policy).summaryLabels;
}

async function listViewerPersonalizationContext(
  viewerId: string,
): Promise<ViewerPersonalizationContext> {
  const [policy, petSignals, preferredPetTypeIds, recentBehaviorEvents, recentDwellEvents, recentBookmarks] =
    await Promise.all([
      getFeedPersonalizationPolicy(),
      listViewerPetSignals(viewerId),
      listPreferredPetTypeIdsByUserId(viewerId),
      listViewerRecentBehaviorEvents(viewerId, 20),
      listViewerRecentDwellEvents(viewerId, 20),
      listViewerRecentBookmarkedPosts(viewerId, 20),
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
  const recentReactions = supportsPostReactionsField()
    ? await prisma.postReaction
        .findMany({
          where: { userId: viewerId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            type: true,
            post: {
              select: {
                petTypeId: true,
                type: true,
                reviewCategory: true,
                animalTags: true,
                petType: {
                  select: {
                    tags: true,
                  },
                },
              },
            },
          },
        })
        .catch((error) => {
          if (
            isMissingPostReactionTableError(error) ||
            isUnavailableReactionsIncludeError(error) ||
            isMissingCommunityBoardSchemaError(error) ||
            isMissingReviewCategoryColumnError(error)
          ) {
            return [];
          }
          throw error;
        })
    : [];
  const positiveReactions = recentReactions.filter((reaction) => reaction.type === "LIKE");
  const negativeReactions = recentReactions.filter((reaction) => reaction.type === "DISLIKE");
  const recentBehaviorSignal = buildRecentBehaviorSignal(recentBehaviorEvents, policy);
  const recentDwellSignal = buildRecentDwellSignal(recentDwellEvents, policy);
  const recentBookmarkSignal = buildRecentBookmarkSignal(recentBookmarks, policy);

  return {
    policy,
    petSignals,
    preferredPetTypeIds: normalizedPreferredPetTypeIds,
    preferredInterestLabels: dedupeInterestLabels(
      preferredCommunities.flatMap((community) =>
        community.tags.map((tag) => normalizeInterestLabel(tag)),
      ),
    ),
    recentEngagementPetTypeIds: dedupeInterestLabels(
      positiveReactions.map((reaction) => reaction.post.petTypeId),
    ),
    recentNegativePetTypeIds: dedupeInterestLabels(
      negativeReactions.map((reaction) => reaction.post.petTypeId),
    ),
    recentEngagementInterestLabels: dedupeInterestLabels(
      positiveReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
    ),
    recentNegativeInterestLabels: dedupeInterestLabels(
      negativeReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
    ),
    recentClickPetTypeWeights: recentBehaviorSignal.recentClickPetTypeWeights,
    recentClickInterestWeights: recentBehaviorSignal.recentClickInterestWeights,
    recentAdBreedWeights: recentBehaviorSignal.recentAdBreedWeights,
    recentAdAudienceKeyWeights: recentBehaviorSignal.recentAdAudienceKeyWeights,
    recentDwellPetTypeWeights: recentDwellSignal.recentDwellPetTypeWeights,
    recentDwellInterestWeights: recentDwellSignal.recentDwellInterestWeights,
    recentBookmarkPetTypeWeights: recentBookmarkSignal.recentBookmarkPetTypeWeights,
    recentBookmarkInterestWeights: recentBookmarkSignal.recentBookmarkInterestWeights,
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
    viewerContext.preferredInterestLabels.length === 0 &&
    viewerContext.recentEngagementPetTypeIds.length === 0 &&
    viewerContext.recentNegativePetTypeIds.length === 0 &&
    viewerContext.recentEngagementInterestLabels.length === 0 &&
    viewerContext.recentNegativeInterestLabels.length === 0 &&
    Object.keys(viewerContext.recentClickPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentClickInterestWeights).length === 0 &&
    Object.keys(viewerContext.recentAdBreedWeights).length === 0 &&
    Object.keys(viewerContext.recentAdAudienceKeyWeights).length === 0 &&
    Object.keys(viewerContext.recentDwellPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentDwellInterestWeights).length === 0 &&
    Object.keys(viewerContext.recentBookmarkPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentBookmarkInterestWeights).length === 0
  ) {
    return items;
  }

  const authorPetByUserId = new Map<string, PetSignal[]>();
  if (
    viewerContext.petSignals.length > 0 ||
    Object.keys(viewerContext.recentAdBreedWeights).length > 0 ||
    Object.keys(viewerContext.recentAdAudienceKeyWeights).length > 0
  ) {
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

  const personalized = scored
    .filter((entry) => entry.boost > viewerContext.policy.personalizedThreshold)
    .map((entry) => entry.item);
  const personalizedSet = new Set(personalized.map((item) => item.id));
  const explore = scored
    .filter((entry) => !personalizedSet.has(entry.item.id))
    .map((entry) => entry.item);

  return interleaveForDiversity(personalized, explore, viewerContext.policy.personalizedRatio);
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
      return attachBookmarkStateToPost(
        await attachPostDetailExtras(withEmptyGuestPostMetaOne(post)),
        viewerId,
      );
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
      return attachBookmarkStateToPost(await attachPostDetailExtras(post), viewerId);
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
      return attachBookmarkStateToPost(
        await attachPostDetailExtras(withEmptyGuestPostMetaOne(post)),
        viewerId,
      );
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
        items: (await attachBookmarkStateToPosts(
          personalizedItems as Array<{ id: string }>,
        viewerId,
      )) as unknown as typeof personalizedItems,
        nextCursor,
      };
    }

    return {
      items: (await attachBookmarkStateToPosts(
        items as Array<{ id: string }>,
        viewerId,
      )) as unknown as typeof items,
      nextCursor,
    };
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
    return (await attachBookmarkStateToPosts(
      items as Array<{ id: string }>,
      viewerId,
    )) as unknown as typeof items;
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

type UserBookmarkedPostListOptions = {
  userId: string;
  type?: PostType;
  q?: string;
};

type UserBookmarkedPostPageOptions = UserBookmarkedPostListOptions & {
  limit: number;
  page: number;
};

function buildUserBookmarkedPostWhere({
  userId,
  type,
  q,
}: UserBookmarkedPostListOptions): Prisma.PostBookmarkWhereInput {
  const equivalentTypes = type ? getEquivalentPostTypes(type) : null;

  return {
    userId,
    post: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
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
  };
}

export async function countUserBookmarkedPosts({
  userId,
  type,
  q,
}: UserBookmarkedPostListOptions) {
  if (!supportsPostBookmarksField()) {
    return 0;
  }

  return prisma.postBookmark
    .count({
      where: buildUserBookmarkedPostWhere({ userId, type, q }),
    })
    .catch((error) => {
      if (!isMissingPostBookmarkTableError(error)) {
        throw error;
      }
      postBookmarksFieldSupport = false;
      return 0;
    });
}

export async function listUserBookmarkedPostsPage({
  userId,
  type,
  q,
  limit,
  page,
}: UserBookmarkedPostPageOptions) {
  if (!supportsPostBookmarksField()) {
    return { items: [], hasNext: false };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const rows = await prisma.postBookmark
    .findMany({
      where: buildUserBookmarkedPostWhere({ userId, type, q }),
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit + 1,
      select: {
        createdAt: true,
        post: {
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
            author: {
              select: {
                id: true,
                nickname: true,
              },
            },
            neighborhood: {
              select: { id: true, name: true, city: true, district: true },
            },
            images: {
              select: { id: true },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (!isMissingPostBookmarkTableError(error)) {
        throw error;
      }
      postBookmarksFieldSupport = false;
      return [];
    });

  const hasNext = rows.length > safeLimit;
  const items = (hasNext ? rows.slice(0, safeLimit) : rows)
    .map((row) =>
      row.post
        ? {
            ...row.post,
            bookmarkedAt: row.createdAt,
            isBookmarked: true,
          }
        : null,
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
    OR to_tsvector('simple', COALESCE(u."nickname", '')) @@ websearch_to_tsquery('simple', ${query})
    ${authorNicknameSimilaritySql}
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
          similarity(COALESCE(u."nickname", ''), ${trimmedQuery})
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
              WHEN COALESCE(u."nickname", '') ILIKE ${likePattern} THEN 1.0
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
    } else {
      addSuggestion(row.title);
      if (resolvedSearchIn === "ALL") {
        addSuggestion(row.author.nickname);
      }
    }

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions.slice(0, limit);
}
