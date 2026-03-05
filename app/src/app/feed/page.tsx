import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import { isCommonBoardPostType } from "@/lib/community-board";
import { isLoginRequiredPostType } from "@/lib/post-access";
import {
  PET_TYPE_PREFERENCE_COOKIE,
  parsePetTypePreferenceCookie,
} from "@/lib/pet-type-preference-cookie";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { postTypeMeta } from "@/lib/post-presenter";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";
import { isLocalRequiredPostType } from "@/lib/post-scope-policy";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import {
  countBestPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import {
  getUserWithNeighborhoods,
  listPetsByUserId,
} from "@/server/queries/user.queries";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedPersonalized = "0" | "1";
type FeedDensity = "DEFAULT" | "ULTRA";
const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;
const REVIEW_FILTER_OPTIONS: Array<{ label: string; value?: ReviewCategory }> = [
  { label: "전체" },
  { label: "용품", value: REVIEW_CATEGORY.SUPPLIES },
  { label: "사료", value: REVIEW_CATEGORY.FEED },
  { label: "간식", value: REVIEW_CATEGORY.SNACK },
  { label: "장난감", value: REVIEW_CATEGORY.TOY },
  { label: "장소", value: REVIEW_CATEGORY.PLACE },
  { label: "기타", value: REVIEW_CATEGORY.ETC },
];
const MAX_DEBUG_DELAY_MS = 5_000;
type BestDay = (typeof BEST_DAY_OPTIONS)[number];
type FeedPeriod = (typeof FEED_PERIOD_OPTIONS)[number];

function extractPreferredPetTypeIds(user: unknown) {
  if (!user || typeof user !== "object") {
    return [];
  }

  const preferredPetTypes = (user as { preferredPetTypes?: unknown }).preferredPetTypes;
  if (!Array.isArray(preferredPetTypes)) {
    return [];
  }

  return preferredPetTypes
    .map((item) =>
      item && typeof item === "object"
        ? (item as { petTypeId?: string | null }).petTypeId
        : null,
    )
    .filter((petTypeId): petTypeId is string => typeof petTypeId === "string");
}

export const metadata: Metadata = {
  title: "피드",
  description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드",
    description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
    url: "/feed",
  },
};

type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    petType?: string | string[];
    communityId?: string;
    q?: string;
    mode?: string;
    days?: string;
    period?: string;
    sort?: string;
    searchIn?: string;
    review?: string;
    personalized?: string;
    page?: string;
    density?: string;
    debugDelayMs?: string;
  }>;
};

async function maybeDebugDelay(value?: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return;
  }

  const delayMs = Math.min(MAX_DEBUG_DELAY_MS, Math.floor(numeric));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function toFeedMode(value?: string): FeedMode {
  return value === "BEST" ? "BEST" : "ALL";
}

function toBestDay(value?: string): BestDay {
  const numeric = Number(value);
  return BEST_DAY_OPTIONS.includes(numeric as BestDay)
    ? (numeric as BestDay)
    : 7;
}

function toFeedPeriod(value?: string): FeedPeriod | null {
  const numeric = Number(value);
  return FEED_PERIOD_OPTIONS.includes(numeric as FeedPeriod)
    ? (numeric as FeedPeriod)
    : null;
}

function toFeedSort(value?: string): FeedSort {
  if (value === "LIKE" || value === "COMMENT") {
    return value;
  }
  return "LATEST";
}

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

function toFeedPersonalized(value?: string): FeedPersonalized {
  return value === "1" ? "1" : "0";
}

function toFeedDensity(value?: string): FeedDensity {
  return value === "ULTRA" ? "ULTRA" : "DEFAULT";
}

function isDatabaseUnavailableError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}

const getGuestFeedContext = unstable_cache(
  async () => {
    const [loginRequiredTypes] = await Promise.all([
      getGuestReadLoginRequiredPostTypes().catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
    ]);

    return {
      loginRequiredTypes,
    };
  },
  ["feed-guest-context"],
  { revalidate: 60 },
);

export default async function Home({ searchParams }: HomePageProps) {
  const [session, communities, cookieStore] = await Promise.all([
    auth(),
    listCommunityNavItems(50).catch(() => []),
    cookies(),
  ]);
  const userId = session?.user?.id;
  const allPetTypeIds = communities.map((item) => item.id);
  const cookiePetTypeIds = parsePetTypePreferenceCookie(
    cookieStore.get(PET_TYPE_PREFERENCE_COOKIE)?.value,
  ).filter((id) => allPetTypeIds.includes(id));
  const user = userId
    ? await getUserWithNeighborhoods(userId).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  const loginRequiredTypes = user
    ? []
    : await getGuestFeedContext().then((context) => context.loginRequiredTypes);
  const preferredPetTypeIds = extractPreferredPetTypeIds(user);
  const isAuthenticated = Boolean(user);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const resolvedParams = (await searchParams) ?? {};
  const legacyCommunityId =
    typeof resolvedParams.communityId === "string" ? resolvedParams.communityId.trim() : "";
  const hasLegacyCommunityId = legacyCommunityId.length > 0;
  const requestedPetTypeValues = Array.isArray(resolvedParams.petType)
    ? resolvedParams.petType
    : typeof resolvedParams.petType === "string"
      ? [resolvedParams.petType]
      : [];
  const normalizedPetTypeValues = requestedPetTypeValues
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const hasPetType =
    normalizedPetTypeValues.length > 0;
  const hasLegacyScope =
    typeof resolvedParams.scope === "string" && resolvedParams.scope.trim().length > 0;
  if ((hasLegacyCommunityId && !hasPetType) || hasLegacyScope) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key === "communityId" || key === "scope") {
        continue;
      }
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
    if (hasLegacyCommunityId && !hasPetType) {
      params.set("petType", legacyCommunityId);
    }
    const serialized = params.toString();
    redirect(serialized ? `/feed?${serialized}` : "/feed");
  }
  await maybeDebugDelay(resolvedParams.debugDelayMs);
  const parsedParams = postListSchema.safeParse({
    ...resolvedParams,
    petType: normalizedPetTypeValues[0],
    limit: FEED_PAGE_SIZE,
  });
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const requestedType = listInput?.type;
  const requestedReviewCategory = listInput?.reviewCategory;
  const isLegacyReviewType =
    requestedType === PostType.PLACE_REVIEW || requestedType === PostType.PRODUCT_REVIEW;
  const type = isLegacyReviewType ? undefined : requestedType;
  const reviewCategory =
    requestedReviewCategory ??
    (requestedType === PostType.PLACE_REVIEW ? REVIEW_CATEGORY.PLACE : undefined);
  const reviewBoard = isLegacyReviewType || Boolean(reviewCategory);
  const requestedPetTypeId = listInput?.petTypeId;
  const requestedPetTypeIds =
    normalizedPetTypeValues.length > 0
      ? Array.from(new Set(normalizedPetTypeValues)).filter((id) => allPetTypeIds.includes(id))
      : requestedPetTypeId
        ? [requestedPetTypeId].filter((id) => allPetTypeIds.includes(id))
        : [];
  const defaultPetTypeIds = isAuthenticated
    ? preferredPetTypeIds.filter((id) => allPetTypeIds.includes(id)).length > 0
      ? preferredPetTypeIds.filter((id) => allPetTypeIds.includes(id))
      : allPetTypeIds
    : cookiePetTypeIds.length > 0
      ? cookiePetTypeIds
      : allPetTypeIds;
  const isCommonBoardType = type ? isCommonBoardPostType(type) : false;
  const isFreeBoardType = type ? isFreeBoardPostType(type) : false;
  const isLocalRequiredType = isLocalRequiredPostType(type);
  const petTypeIds = isCommonBoardType || isFreeBoardType
    ? []
    : requestedPetTypeIds.length > 0
      ? requestedPetTypeIds
      : defaultPetTypeIds;
  const petTypeId = petTypeIds[0];
  const selectedScope = isLocalRequiredType ? PostScope.LOCAL : PostScope.GLOBAL;
  const effectiveScope = isAuthenticated
    ? selectedScope
    : isLocalRequiredType
      ? PostScope.LOCAL
      : PostScope.GLOBAL;
  const mode = toFeedMode(resolvedParams.mode);
  const bestDays = toBestDay(resolvedParams.days);
  const periodDays = toFeedPeriod(resolvedParams.period);
  const selectedSort = toFeedSort(resolvedParams.sort);
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
  const selectedPersonalized = toFeedPersonalized(resolvedParams.personalized);
  const density = toFeedDensity(resolvedParams.density);
  const isUltraDense = density === "ULTRA";
  const usePersonalizedFeed =
    isAuthenticated && mode === "ALL" && selectedPersonalized === "1";
  const isGuestTypeBlocked =
    !isAuthenticated && isLoginRequiredPostType(requestedType, loginRequiredTypes);

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (isAuthenticated && !primaryNeighborhood && effectiveScope !== PostScope.GLOBAL) {
    if (isLocalRequiredType && type) {
      return (
        <NeighborhoodGateNotice
          title="내 동네 설정이 필요합니다."
          description={`${postTypeMeta[type].label} 게시판은 내 동네 기반으로 노출됩니다. 프로필에서 동네를 먼저 설정해 주세요.`}
          primaryLink="/profile"
          primaryLabel="프로필에서 동네 설정"
        />
      );
    }

    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 피드를 확인할 수 있습니다."
        primaryLink="/profile"
        primaryLabel="프로필에서 동네 설정"
        secondaryLink="/feed"
        secondaryLabel="피드 보기"
      />
    );
  }

  const limit = FEED_PAGE_SIZE;
  const query = listInput?.q?.trim() ?? "";
  const requestedPage = Number.parseInt(resolvedParams.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const neighborhoodId =
    effectiveScope === PostScope.LOCAL
      ? primaryNeighborhood?.neighborhood.id
      : undefined;

  const totalItemCount =
    mode === "BEST" && !isGuestTypeBlocked
      ? await countBestPosts({
          days: bestDays,
          type,
          reviewBoard,
          reviewCategory,
          scope: effectiveScope,
          petTypeId,
          petTypeIds,
          q: query || undefined,
          searchIn: selectedSearchIn,
          excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
          neighborhoodId,
          minLikes: 1,
          viewerId: user?.id,
        }).catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return 0;
          }
          throw error;
        })
      : 0;

  const totalPages = mode === "BEST" ? Math.max(1, Math.ceil(totalItemCount / limit)) : 1;
  const resolvedPage = mode === "BEST" ? Math.min(currentPage, totalPages) : 1;

  const posts =
    mode === "ALL" && !isGuestTypeBlocked
      ? await listPosts({
          limit,
          type,
          reviewBoard,
          reviewCategory,
          scope: effectiveScope,
          petTypeId,
          petTypeIds,
          q: query || undefined,
          searchIn: selectedSearchIn,
          days: periodDays ?? undefined,
          sort: selectedSort,
          excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
          neighborhoodId,
          viewerId: user?.id,
          personalized: usePersonalizedFeed,
        }).catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return { items: [], nextCursor: null };
          }
          throw error;
        })
      : { items: [], nextCursor: null };

  const bestItems =
    mode === "BEST" && !isGuestTypeBlocked
      ? await listBestPosts({
          limit,
          page: resolvedPage,
          days: bestDays,
          type,
          reviewBoard,
          reviewCategory,
          scope: effectiveScope,
          petTypeId,
          petTypeIds,
          q: query || undefined,
          searchIn: selectedSearchIn,
          excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
          neighborhoodId,
          minLikes: 1,
          viewerId: user?.id,
        }).catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return [];
          }
          throw error;
        })
      : [];

  const items = mode === "BEST" ? bestItems : posts.items;
  const feedTitle = reviewBoard
    ? "리뷰 게시판"
    : type
      ? `${postTypeMeta[type].label} 게시판`
      : "전체 게시판";
  const selectedSortLabel =
    selectedSort === "LIKE" ? "좋아요" : selectedSort === "COMMENT" ? "댓글" : "최신";
  const loginHref = (nextPath: string) =>
    `/login?next=${encodeURIComponent(nextPath)}`;
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    reviewBoard ? "REVIEW" : "GENERAL",
    reviewCategory ?? "ALL_REVIEW",
    petTypeId ?? "ALL_COMMUNITIES",
    petTypeIds.join(",") || "ALL_COMMUNITIES_MULTI",
    selectedSort,
    selectedSearchIn,
    selectedPersonalized,
    density,
    bestDays,
    periodDays ?? "ALL_TIME",
    query || "__EMPTY__",
    mode === "BEST" ? resolvedPage : "CURSOR",
  ].join("|");
  const viewerUserId = user?.id ?? null;
  const shouldLoadViewerPetsForAd =
    Boolean(viewerUserId) && mode === "ALL" && effectiveScope === PostScope.GLOBAL;
  const viewerPets = shouldLoadViewerPetsForAd && viewerUserId
    ? await listPetsByUserId(viewerUserId, { limit: 1, cacheTtlMs: 60_000 }).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      })
    : [];
  const primaryPet = viewerPets[0] ?? null;
  const adAudienceKey = primaryPet?.breedCode?.trim()
    ? primaryPet.breedCode.trim().toUpperCase()
    : primaryPet?.species ?? null;
  const adConfig =
    mode === "ALL" && effectiveScope === PostScope.GLOBAL && adAudienceKey
      ? {
          audienceKey: adAudienceKey,
          headline: `${primaryPet?.breedLabel?.trim() || adAudienceKey} 보호자를 위한 맞춤 공동구매`,
          description:
            "품종/체급에 맞춘 사료·간식·위생용품 공동구매 모집 글을 확인해 보세요. 광고는 세션/일 빈도 캡 정책으로 제한됩니다.",
          ctaLabel: "맞춤 공동구매 보기",
          ctaHref: `/lounges/breeds/${adAudienceKey}`,
          sessionCap: 3,
          dailyCap: 8,
        }
      : undefined;
  const initialFeedItems: FeedPostItem[] = items.map((post) => ({
    id: post.id,
    type: post.type,
    scope: post.scope,
    status: post.status,
    title: post.title,
    content: post.content,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    dislikeCount: post.dislikeCount,
    viewCount: post.viewCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      name: post.author.name,
      nickname: post.author.nickname,
      image: post.author.image,
    },
    guestDisplayName:
      (post as { guestDisplayName?: string | null }).guestDisplayName ??
      (post as { guestAuthor?: { displayName?: string | null } | null }).guestAuthor
        ?.displayName ??
      null,
    guestIpDisplay:
      (post as { guestIpDisplay?: string | null }).guestIpDisplay ??
      (post as { guestAuthor?: { ipDisplay?: string | null } | null }).guestAuthor?.ipDisplay ??
      null,
    guestIpLabel:
      (post as { guestIpLabel?: string | null }).guestIpLabel ??
      (post as { guestAuthor?: { ipLabel?: string | null } | null }).guestAuthor?.ipLabel ??
      null,
    neighborhood: post.neighborhood
      ? {
          id: post.neighborhood.id,
          name: post.neighborhood.name,
          city: post.neighborhood.city,
          district: post.neighborhood.district,
        }
      : null,
    petType:
      (post as {
        petType?: {
          id: string;
          labelKo: string;
          category: { labelKo: string };
        } | null;
      }).petType
      ? {
          id: (post as { petType: { id: string } }).petType.id,
          labelKo: (post as { petType: { labelKo: string } }).petType.labelKo,
          categoryLabelKo: (post as { petType: { category: { labelKo: string } } }).petType
            .category.labelKo,
        }
      : null,
    images: post.images.map((image) => ({
      id: image.id,
    })),
    reactions:
      (post as { reactions?: Array<{ type: "LIKE" | "DISLIKE" }> }).reactions?.map(
        (reaction) => ({ type: reaction.type }),
      ) ?? [],
  }));

  const makeHref = ({
    nextType,
    nextPetTypeId,
    nextReviewCategory,
    nextQuery,
    nextPage,
    nextMode,
    nextDays,
    nextPeriod,
    nextSort,
    nextSearchIn,
    nextPersonalized,
    nextDensity,
  }: {
    nextType?: PostType | null;
    nextPetTypeId?: string | null;
    nextReviewCategory?: ReviewCategory | null;
    nextQuery?: string | null;
    nextPage?: number | null;
    nextMode?: FeedMode | null;
    nextDays?: BestDay | null;
    nextPeriod?: FeedPeriod | null;
    nextSort?: FeedSort | null;
    nextSearchIn?: FeedSearchIn | null;
    nextPersonalized?: FeedPersonalized | null;
    nextDensity?: FeedDensity | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedPetTypeIds =
      nextPetTypeId === undefined
        ? petTypeIds
        : nextPetTypeId
          ? [nextPetTypeId]
          : [];
    const resolvedReviewCategory =
      nextReviewCategory === undefined ? reviewCategory : nextReviewCategory;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;
    const resolvedMode = nextMode === undefined ? mode : nextMode;
    const resolvedDays = nextDays === undefined ? bestDays : nextDays;
    const resolvedPeriod = nextPeriod === undefined ? periodDays : nextPeriod;
    const resolvedSort = nextSort === undefined ? selectedSort : nextSort;
    const resolvedSearchIn =
      nextSearchIn === undefined ? selectedSearchIn : nextSearchIn;
    const resolvedPersonalized =
      nextPersonalized === undefined ? selectedPersonalized : nextPersonalized;
    const resolvedDensity = nextDensity === undefined ? density : nextDensity;
    const effectivePage =
      nextPage === undefined ? (resolvedMode === "BEST" ? resolvedPage : 1) : nextPage;
    const shouldKeepReviewBoard =
      reviewBoard && resolvedType === undefined && !resolvedReviewCategory;
    const normalizedType = shouldKeepReviewBoard ? PostType.PRODUCT_REVIEW : resolvedType;

    if (normalizedType) params.set("type", normalizedType);
    const canUseCommunityFilter =
      !normalizedType ||
      (!isCommonBoardPostType(normalizedType) && !isFreeBoardPostType(normalizedType));
    if (canUseCommunityFilter) {
      for (const value of resolvedPetTypeIds) {
        params.append("petType", value);
      }
    }
    if (resolvedReviewCategory) {
      params.set("review", resolvedReviewCategory);
    }
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (resolvedSearchIn && resolvedSearchIn !== "ALL") {
      params.set("searchIn", resolvedSearchIn);
    }
    if (resolvedMode === "ALL" && resolvedPersonalized === "1" && isAuthenticated) {
      params.set("personalized", "1");
    }
    if (resolvedDensity === "ULTRA") {
      params.set("density", "ULTRA");
    }
    if (resolvedMode === "BEST") {
      params.set("mode", "BEST");
      params.set("days", String(resolvedDays));
    } else if (resolvedSort && resolvedSort !== "LATEST") {
      params.set("sort", resolvedSort);
      if (resolvedPeriod) {
        params.set("period", String(resolvedPeriod));
      }
    } else if (resolvedMode === "ALL" && resolvedPeriod) {
      params.set("period", String(resolvedPeriod));
    }
    if (resolvedMode === "BEST" && effectivePage && effectivePage > 1) {
      params.set("page", String(effectivePage));
    }

    const serialized = params.toString();
    return serialized ? `/feed?${serialized}` : "/feed";
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_55%,#fbfdff_100%)] pb-16">
      <main
        className={`mx-auto flex w-full max-w-[1320px] flex-col px-4 sm:px-6 lg:px-10 ${
          isUltraDense ? "gap-1.5 py-2 sm:gap-2" : "gap-2 py-3 sm:gap-3"
        }`}
      >
        <div className={isUltraDense ? "space-y-2" : "space-y-3"}>
          <header
            className={`tp-hero hidden animate-float-in sm:block ${
              isUltraDense ? "sm:px-3 sm:py-2" : "sm:px-4 sm:py-2.5"
            }`}
          >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1
                className={
                  isUltraDense
                     ? "mt-0.5 text-[15px] font-semibold text-[#1e3f74] sm:text-base"
                     : "mt-0.5 text-lg font-semibold text-[#1e3f74] sm:text-[22px]"
                 }
               >
                 {feedTitle}
               </h1>
              </div>
            </div>
           </header>

        <a
          href="#feed-list"
          className="tp-btn-soft hidden w-fit items-center px-3 py-1.5 text-xs font-semibold sm:inline-flex lg:hidden"
        >
          목록 바로가기
        </a>

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
            선택한 카테고리({postTypeMeta[type].label})는 로그인 후 열람할 수 있습니다.{" "}
            <Link
              href={loginHref(`/feed?type=${type}`)}
              className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
            >
              로그인하기
            </Link>
          </div>
        ) : null}

        <section id="feed-list" className="tp-card animate-fade-up overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2ebf8] bg-[#f8fbff] px-3 py-2 text-xs text-[#4c6f9e] sm:px-5 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={makeHref({ nextMode: "ALL", nextPage: 1 })}
                className={`rounded-md border px-2 py-0.5 font-medium transition ${
                  mode === "ALL"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                전체글
              </Link>
              <Link
                href={makeHref({ nextMode: "BEST", nextPage: 1 })}
                className={`rounded-md border px-2 py-0.5 font-medium transition ${
                  mode === "BEST"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                베스트글
              </Link>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#5a7398] sm:hidden">
              <span className="rounded border border-[#d2e0f3] bg-white px-1.5 py-0.5">{selectedSortLabel}</span>
              <span className="rounded border border-[#d2e0f3] bg-white px-1.5 py-0.5">{mode === "BEST" ? "베스트" : "전체"}</span>
            </div>
            {reviewBoard ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="px-0.5 text-[#b5c7e3]">|</span>
                <span className="font-semibold text-[#4b6b9b]">리뷰</span>
                {REVIEW_FILTER_OPTIONS.map((option) => {
                  const isActive = (option.value ?? null) === (reviewCategory ?? null);
                  return (
                    <Link
                      key={`review-filter-${option.value ?? "all"}`}
                      href={makeHref({
                        nextType: PostType.PRODUCT_REVIEW,
                        nextReviewCategory: option.value ?? null,
                        nextPage: 1,
                      })}
                      className={`px-1 py-0.5 text-[11px] font-semibold transition ${
                        isActive
                          ? "text-[#204f8a] underline underline-offset-2"
                          : "text-[#5173a3] hover:text-[#204f8a]"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
          <details className="border-b border-[#e2ebf8] bg-white sm:hidden">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-[11px] font-semibold text-[#4b6b9b]">
              필터 자세히
            </summary>
            <div className="space-y-2 border-t border-[#eef3fb] px-3 py-2 text-[11px] text-[#5a7398]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-semibold text-[#4b6b9b]">정렬</span>
                {([
                  { value: "LATEST", label: "최신" },
                  { value: "LIKE", label: "좋아요" },
                  { value: "COMMENT", label: "댓글" },
                ] as const).map((option) => (
                  <Link
                    key={`mobile-inline-sort-${option.value}`}
                    href={makeHref({ nextSort: option.value, nextPage: 1 })}
                    className={`rounded-md border px-2 py-0.5 font-medium transition ${
                      selectedSort === option.value
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
              <details className="rounded-md border border-[#dbe6f6] bg-[#f9fbff]">
                <summary className="cursor-pointer list-none px-2.5 py-1.5 text-[11px] font-semibold text-[#4b6b9b]">
                  기간/리뷰 옵션
                </summary>
                <div className="space-y-2 border-t border-[#e6eefb] px-2.5 py-2">
                  {mode === "ALL" ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-semibold text-[#4b6b9b]">기간</span>
                      <Link
                        href={makeHref({ nextPeriod: null, nextPage: 1 })}
                        className={`rounded-md border px-2 py-0.5 font-medium transition ${
                          !periodDays
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        전체
                      </Link>
                      {FEED_PERIOD_OPTIONS.map((day) => (
                        <Link
                          key={`mobile-inline-period-${day}`}
                          href={makeHref({ nextPeriod: day, nextPage: 1 })}
                          className={`rounded-md border px-2 py-0.5 font-medium transition ${
                            periodDays === day
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                          }`}
                        >
                          {day}일
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-semibold text-[#4b6b9b]">집계 기간</span>
                      {BEST_DAY_OPTIONS.map((day) => (
                        <Link
                          key={`mobile-inline-best-day-${day}`}
                          href={makeHref({ nextDays: day, nextPage: 1 })}
                          className={`rounded-md border px-2 py-0.5 font-medium transition ${
                            bestDays === day
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                          }`}
                        >
                          최근 {day}일
                        </Link>
                      ))}
                    </div>
                  )}
                  {reviewBoard ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-semibold text-[#4b6b9b]">리뷰</span>
                      {REVIEW_FILTER_OPTIONS.map((option) => {
                        const isActive = (option.value ?? null) === (reviewCategory ?? null);
                        return (
                          <Link
                            key={`mobile-review-filter-${option.value ?? "all"}`}
                            href={makeHref({
                              nextType: PostType.PRODUCT_REVIEW,
                              nextReviewCategory: option.value ?? null,
                              nextPage: 1,
                            })}
                            className={`px-1 py-0.5 font-semibold transition ${
                              isActive
                                ? "text-[#204f8a] underline underline-offset-2"
                                : "text-[#5173a3] hover:text-[#204f8a]"
                            }`}
                          >
                            {option.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          </details>
          {mode === "ALL" ? (
            <div className="hidden flex-wrap items-center gap-1.5 border-b border-[#e2ebf8] bg-white px-4 py-2 text-[11px] text-[#5a7398] sm:flex sm:px-5">
              <span className="mr-1 font-semibold text-[#4b6b9b]">정렬</span>
              {([
                { value: "LATEST", label: "최신" },
                { value: "LIKE", label: "좋아요" },
                { value: "COMMENT", label: "댓글" },
              ] as const).map((option) => (
                <Link
                  key={`inline-sort-${option.value}`}
                  href={makeHref({ nextSort: option.value, nextPage: 1 })}
                  className={`rounded-md border px-2 py-0.5 font-medium transition ${
                    selectedSort === option.value
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
              <span className="mx-1 text-[#c0cfe5]">|</span>
              <span className="mr-1 font-semibold text-[#4b6b9b]">기간</span>
              <Link
                href={makeHref({ nextPeriod: null, nextPage: 1 })}
                className={`rounded-md border px-2 py-0.5 font-medium transition ${
                  !periodDays
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                전체
              </Link>
              {FEED_PERIOD_OPTIONS.map((day) => (
                <Link
                  key={`inline-period-${day}`}
                  href={makeHref({ nextPeriod: day, nextPage: 1 })}
                  className={`rounded-md border px-2 py-0.5 font-medium transition ${
                    periodDays === day
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  {day}일
                </Link>
              ))}
            </div>
          ) : (
            <div className="hidden flex-wrap items-center gap-1.5 border-b border-[#e2ebf8] bg-white px-4 py-2 text-[11px] text-[#5a7398] sm:flex sm:px-5">
              <span className="mr-1 font-semibold text-[#4b6b9b]">집계 기간</span>
              {BEST_DAY_OPTIONS.map((day) => (
                <Link
                  key={`inline-best-day-${day}`}
                  href={makeHref({ nextDays: day, nextPage: 1 })}
                  className={`rounded-md border px-2 py-0.5 font-medium transition ${
                    bestDays === day
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  최근 {day}일
                </Link>
              ))}
            </div>
          )}
          {items.length === 0 ? (
            <EmptyState
              title={mode === "BEST" ? "베스트글이 없습니다" : "게시글이 없습니다"}
              description={
                isGuestTypeBlocked
                  ? "해당 카테고리는 로그인 후 확인할 수 있습니다."
                  : mode === "BEST"
                  ? "선택한 카테고리/범위에서 좋아요가 1개 이상인 글이 아직 없습니다."
                  : "글을 작성하거나 다른 카테고리를 확인해 주세요."
              }
              actionHref={
                isGuestTypeBlocked
                  ? loginHref(`/feed${type ? `?type=${type}` : ""}`)
                  : mode === "BEST"
                    ? "/feed?mode=ALL"
                    : "/posts/new"
              }
              actionLabel={
                isGuestTypeBlocked
                  ? "로그인하고 보기"
                  : mode === "BEST"
                    ? "전체글 보기"
                    : "첫 글 작성하기"
               }
            />
          ) : (
            <FeedInfiniteList
              initialItems={initialFeedItems}
              initialNextCursor={mode === "ALL" ? posts.nextCursor : null}
              mode={mode}
              disableLoadMore={mode !== "ALL"}
              preferGuestDetail={!isAuthenticated}
                query={{
                  type,
                  scope: effectiveScope,
                  petTypeId,
                  petTypeIds,
                  reviewCategory,
                  q: query || undefined,
                  searchIn: selectedSearchIn,
                sort: selectedSort,
                days: periodDays ?? undefined,
                personalized: usePersonalizedFeed,
              }}
              queryKey={feedQueryKey}
              adConfig={adConfig}
            />
          )}
          {mode === "BEST" && items.length > 0 && totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-[#dbe6f6] bg-[#f8fbff] px-3 py-3">
              <Link
                href={makeHref({ nextPage: Math.max(1, resolvedPage - 1) })}
                aria-disabled={resolvedPage <= 1}
                className={`inline-flex h-8 items-center border px-2.5 text-xs font-semibold transition ${
                  resolvedPage <= 1
                    ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                이전
              </Link>
              {Array.from(
                {
                  length:
                    Math.min(totalPages, Math.max(5, resolvedPage + 2)) -
                    Math.max(1, Math.min(resolvedPage - 2, totalPages - 4)) +
                    1,
                },
                (_, index) =>
                  Math.max(1, Math.min(resolvedPage - 2, totalPages - 4)) + index,
              ).map((pageNumber) => (
                <Link
                  key={`feed-page-${pageNumber}`}
                  href={makeHref({ nextPage: pageNumber })}
                  className={`inline-flex h-8 min-w-8 items-center justify-center border px-2 text-xs font-semibold transition ${
                    pageNumber === resolvedPage
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={makeHref({ nextPage: Math.min(totalPages, resolvedPage + 1) })}
                aria-disabled={resolvedPage >= totalPages}
                className={`inline-flex h-8 items-center border px-2.5 text-xs font-semibold transition ${
                  resolvedPage >= totalPages
                    ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                다음
              </Link>
            </div>
          ) : null}
        </section>

         <div className="flex justify-end gap-2">
           <ScrollToTopButton
             className="tp-btn-soft inline-flex h-9 items-center justify-center px-3.5 text-xs font-semibold"
           />
           <Link
             href="/posts/new"
             className="tp-btn-primary inline-flex h-9 items-center justify-center px-4 text-xs font-semibold hover:bg-[#274f8c]"
           >
             글쓰기
           </Link>
        </div>

        </div>
      </main>
    </div>
  );
}
