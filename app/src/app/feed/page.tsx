import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import { isCommonBoardPostType } from "@/lib/community-board";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { postTypeMeta } from "@/lib/post-presenter";
import { PRIMARY_POST_TYPES, SECONDARY_POST_TYPES } from "@/lib/post-type-groups";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listCommunities } from "@/server/queries/community.queries";
import {
  countBestPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getUserWithNeighborhoods, listPetsByUserId } from "@/server/queries/user.queries";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedPersonalized = "0" | "1";
type FeedDensity = "DEFAULT" | "ULTRA";
const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;
const MAX_DEBUG_DELAY_MS = 5_000;
const FEED_SORT_OPTIONS: ReadonlyArray<{ value: FeedSort; label: string }> = [
  { value: "LATEST", label: "최신순" },
  { value: "LIKE", label: "좋아요순" },
  { value: "COMMENT", label: "댓글순" },
];
type BestDay = (typeof BEST_DAY_OPTIONS)[number];
type FeedPeriod = (typeof FEED_PERIOD_OPTIONS)[number];

export const metadata: Metadata = {
  title: "피드",
  description: "동네와 온동네 게시글을 최신순/인기순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드",
    description: "동네와 온동네 게시글을 최신순/인기순으로 확인하세요.",
    url: "/feed",
  },
};

type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    petType?: string;
    q?: string;
    mode?: string;
    days?: string;
    period?: string;
    sort?: string;
    searchIn?: string;
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
    const [loginRequiredTypes, popularSearchTerms, communities] = await Promise.all([
      getGuestReadLoginRequiredPostTypes().catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
      getPopularSearchTerms(8).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
      listCommunities({ limit: 50 }).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return { items: [], nextCursor: null };
        }
        throw error;
      }),
    ]);

    return {
      loginRequiredTypes,
      popularSearchTerms,
      communities,
    };
  },
  ["feed-guest-context"],
  { revalidate: 60 },
);

export default async function Home({ searchParams }: HomePageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId
    ? await getUserWithNeighborhoods(userId).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  const { loginRequiredTypes, popularSearchTerms, communities } = user
    ? await Promise.all([
        getGuestReadLoginRequiredPostTypes().catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return [];
          }
          throw error;
        }),
        getPopularSearchTerms(8).catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return [];
          }
          throw error;
        }),
        listCommunities({ limit: 50 }).catch((error) => {
          if (isDatabaseUnavailableError(error)) {
            return { items: [], nextCursor: null };
          }
          throw error;
        }),
      ]).then(([loginRequiredTypes, popularSearchTerms, communities]) => ({
        loginRequiredTypes,
        popularSearchTerms,
        communities,
      }))
    : await getGuestFeedContext();
  const isAuthenticated = Boolean(user);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const resolvedParams = (await searchParams) ?? {};
  await maybeDebugDelay(resolvedParams.debugDelayMs);
  const parsedParams = postListSchema.safeParse({
    ...resolvedParams,
    limit: FEED_PAGE_SIZE,
  });
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const type = listInput?.type;
  const scope = listInput?.scope;
  const requestedPetTypeId = listInput?.petTypeId;
  const isCommonBoardType = type ? isCommonBoardPostType(type) : false;
  const petTypeId = isCommonBoardType ? undefined : requestedPetTypeId;
  const selectedScope = scope ?? PostScope.GLOBAL;
  const effectiveScope = isAuthenticated ? selectedScope : PostScope.GLOBAL;
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
  const isGuestLocalBlocked = !isAuthenticated && selectedScope === PostScope.LOCAL;
  const isGuestTypeBlocked =
    !isAuthenticated && isLoginRequiredPostType(type, loginRequiredTypes);

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (isAuthenticated && !primaryNeighborhood && effectiveScope !== PostScope.GLOBAL) {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 피드를 확인할 수 있습니다."
        secondaryLink="/feed?scope=GLOBAL"
        secondaryLabel="온동네 피드 보기"
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
          scope: effectiveScope,
          communityId: petTypeId,
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
          scope: effectiveScope,
          communityId: petTypeId,
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
          scope: effectiveScope,
          communityId: petTypeId,
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
  const localCount = items.filter((post) => post.scope === PostScope.LOCAL).length;
  const secondaryCategoryTypes = SECONDARY_POST_TYPES;
  const feedTitle = type ? `${postTypeMeta[type].label} 게시판` : "전체 게시판";
  const loginHref = (nextPath: string) =>
    `/login?next=${encodeURIComponent(nextPath)}`;
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    petTypeId ?? "ALL_COMMUNITIES",
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
    community:
      (post as {
        community?: {
          id: string;
          labelKo: string;
          category: { labelKo: string };
        } | null;
      }).community
      ? {
          id: (post as { community: { id: string } }).community.id,
          labelKo: (post as { community: { labelKo: string } }).community.labelKo,
          categoryLabelKo: (post as { community: { category: { labelKo: string } } }).community
            .category.labelKo,
        }
      : null,
    images: post.images.map((image) => ({
      id: image.id,
    })),
    reactions: post.reactions?.map((reaction) => ({ type: reaction.type })) ?? [],
  }));

  const makeHref = ({
    nextType,
    nextScope,
    nextPetTypeId,
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
    nextScope?: PostScope | null;
    nextPetTypeId?: string | null;
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
    const resolvedScope = nextScope === undefined ? selectedScope : nextScope;
    const resolvedPetTypeId =
      nextPetTypeId === undefined ? petTypeId : nextPetTypeId;
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

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
    if (resolvedPetTypeId) {
      const canUseCommunityFilter = !resolvedType || !isCommonBoardPostType(resolvedType);
      if (canUseCommunityFilter) {
        params.set("petType", resolvedPetTypeId);
      }
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8ff_55%,#eef5ff_100%)] pb-16">
      <main
        className={`mx-auto flex w-full max-w-[1320px] flex-col px-4 sm:px-6 lg:px-10 ${
          isUltraDense ? "gap-1.5 py-2 sm:gap-2" : "gap-2 py-3 sm:gap-3"
        }`}
      >
        <div className={isUltraDense ? "space-y-2" : "space-y-3"}>
          <header
            className={`animate-float-in rounded-2xl border border-[#d9e5f7] bg-[linear-gradient(180deg,#fafdff_0%,#f2f7ff_100%)] shadow-[0_10px_24px_rgba(30,63,116,0.06)] ${
              isUltraDense ? "px-2.5 py-2 sm:px-3 sm:py-2.5" : "px-3 py-3 sm:px-5 sm:py-4"
            }`}
          >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#5578ad]">
                타운펫 관심 동물
              </p>
              <h1
                className={
                  isUltraDense
                     ? "mt-0.5 text-base font-bold tracking-tight text-[#1e3f74] sm:text-lg"
                     : "mt-0.5 text-[24px] font-bold tracking-tight text-[#1e3f74] sm:text-[28px]"
                 }
               >
                 {feedTitle}
               </h1>
               <p className="mt-1 hidden text-xs text-[#6784ac] sm:block">
                 우리 동네 반려 이웃들의 이야기를 살펴보세요.
               </p>
             </div>
             <div className="hidden items-center gap-1.5 text-xs text-[#4f678d] sm:flex">
               <div className="rounded-full border border-[#d7e3f6] bg-white px-3 py-1">
                 {mode === "BEST" ? "베스트글" : "전체글"} {items.length}건
               </div>
             </div>
           </div>
          </header>

        <a
          href="#feed-list"
          className="inline-flex w-fit items-center rounded-sm border border-[#bfd0ec] bg-white px-2.5 py-1 text-xs font-semibold text-[#2f548f] lg:hidden"
        >
          목록 바로가기
        </a>

        <section
          className={`animate-fade-up rounded-2xl border border-[#d9e5f7] bg-white/95 shadow-[0_12px_28px_rgba(30,63,116,0.06)] ${
            isUltraDense ? "p-1.5 sm:p-2" : "p-2.5 sm:p-3.5"
          }`}
        >
          {isGuestLocalBlocked ? (
            <div className="mb-3 border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
              동네(Local) 피드는 로그인 후 이용할 수 있습니다.{" "}
              <Link
                href={loginHref("/feed?scope=LOCAL")}
                className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
              >
                로그인하기
              </Link>
            </div>
          ) : null}
          {isGuestTypeBlocked && type ? (
            <div className="mb-3 border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
              선택한 카테고리({postTypeMeta[type].label})는 로그인 후 열람할 수 있습니다.{" "}
              <Link
                href={loginHref(`/feed?type=${type}`)}
                className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
              >
                로그인하기
              </Link>
            </div>
          ) : null}
          <div className={`grid ${isUltraDense ? "gap-1.5" : "gap-2.5"}`}>
            <div className={isUltraDense ? "space-y-1.5" : "space-y-2"}>
              <FeedSearchForm
                actionPath="/feed"
                query={query}
                searchIn={selectedSearchIn}
                personalized={selectedPersonalized}
                type={type}
                scope={selectedScope}
                petTypeId={petTypeId}
                mode={mode}
                days={bestDays}
                period={periodDays}
                sort={selectedSort}
                resetHref={makeHref({ nextQuery: null, nextPage: 1 })}
                popularTerms={popularSearchTerms}
                density={density}
                showKeywordChips
              />

              <details className="group rounded-xl border border-[#d6e4f7] bg-[#f8fbff] p-2 sm:p-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#2f548f] transition hover:bg-white">
                  <span>글 보기 방식</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d4e2f6] bg-[#f8fbff] text-[#5f7ea8]">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="tp-soft-card p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                      모드
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Link
                        href={makeHref({ nextMode: "ALL", nextPage: 1 })}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          mode === "ALL"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        전체글
                      </Link>
                      <Link
                        href={makeHref({ nextMode: "BEST", nextPage: 1 })}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          mode === "BEST"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        베스트글
                      </Link>
                    </div>
                    <div className="mt-2 border-t border-[#dbe6f6] pt-2">
                      {mode === "BEST" ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {BEST_DAY_OPTIONS.map((day) => (
                            <Link
                              key={`mobile-best-${day}`}
                              href={makeHref({ nextDays: day, nextPage: 1 })}
                               className={`rounded-full border px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                                 bestDays === day
                                   ? "border-[#3567b5] bg-[#3567b5] text-white"
                                   : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                               }`}
                             >
                               최근 {day}일
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {FEED_SORT_OPTIONS.map((option) => (
                              <Link
                                key={`mobile-sort-${option.value}`}
                                href={makeHref({ nextSort: option.value, nextPage: 1 })}
                                 className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                   selectedSort === option.value
                                     ? "border-[#3567b5] bg-[#3567b5] text-white"
                                     : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                                 }`}
                               >
                                 {option.label}
                              </Link>
                            ))}
                          </div>
                          <div className="hidden flex-wrap gap-1.5 sm:flex">
                            <Link
                              href={makeHref({ nextPeriod: null, nextPage: 1 })}
                               className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                 !periodDays
                                   ? "border-[#3567b5] bg-[#3567b5] text-white"
                                   : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                               }`}
                             >
                               전체 기간
                            </Link>
                            {FEED_PERIOD_OPTIONS.map((day) => (
                              <Link
                                key={`mobile-period-${day}`}
                                href={makeHref({ nextPeriod: day, nextPage: 1 })}
                                 className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                   periodDays === day
                                     ? "border-[#3567b5] bg-[#3567b5] text-white"
                                     : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                                 }`}
                               >
                                 최근 {day}일
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </details>

              <details className="group rounded-xl border border-[#d6e4f7] bg-[#f8fbff] p-2 sm:p-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#2f548f] transition hover:bg-white">
                  <span>게시판 선택</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d4e2f6] bg-[#f8fbff] text-[#5f7ea8]">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="tp-soft-card p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">범위</p>
                    <div className="mt-1.5 grid gap-1.5">
                      <Link
                        href={
                          isAuthenticated
                            ? makeHref({ nextScope: PostScope.LOCAL, nextPage: 1 })
                            : loginHref("/feed?scope=LOCAL")
                        }
                        className={`rounded-full border px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                          selectedScope === PostScope.LOCAL
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        동네
                      </Link>
                      <Link
                        href={makeHref({ nextScope: PostScope.GLOBAL, nextPage: 1 })}
                        className={`rounded-full border px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                          selectedScope === PostScope.GLOBAL
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        온동네
                      </Link>
                    </div>
                  </div>
                  <div className="tp-soft-card p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">주요 게시판</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Link
                        href={makeHref({ nextType: null, nextPage: 1 })}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          !type
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        전체
                      </Link>
                      {PRIMARY_POST_TYPES.map((value) => {
                        const isRestricted =
                          !isAuthenticated &&
                          isLoginRequiredPostType(value, loginRequiredTypes);
                        const targetHref = makeHref({ nextType: value, nextPage: 1 });
                        return (
                          <Link
                            key={`mobile-primary-${value}`}
                            href={isRestricted ? loginHref(targetHref) : targetHref}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                              type === value
                                ? "border-[#3567b5] bg-[#3567b5] text-white"
                                : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                            }`}
                          >
                            {postTypeMeta[value].label}
                            {isRestricted ? " (로그인)" : ""}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <div className="tp-soft-card p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">관심 동물</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Link
                        href={makeHref({ nextPetTypeId: null, nextPage: 1 })}
                        aria-disabled={isCommonBoardType}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          isCommonBoardType
                            ? "pointer-events-none cursor-not-allowed border-[#d7e2f3] bg-[#eef3fb] text-[#8aa0be]"
                            : !petTypeId
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                        }`}
                      >
                        전체
                      </Link>
                      {communities.items.map((community) => (
                        <Link
                          key={`mobile-community-${community.id}`}
                          href={makeHref({ nextPetTypeId: community.id, nextPage: 1 })}
                          aria-disabled={isCommonBoardType}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                            isCommonBoardType
                              ? "pointer-events-none cursor-not-allowed border-[#d7e2f3] bg-[#eef3fb] text-[#8aa0be]"
                              : petTypeId === community.id
                                ? "border-[#3567b5] bg-[#3567b5] text-white"
                                : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                          }`}
                        >
                          {community.labelKo}
                        </Link>
                      ))}
                    </div>
                    {isCommonBoardType ? (
                      <p className="mt-1.5 text-[11px] text-[#5d789f]">
                        공용 보드는 관심 동물 필터 없이 전체 노출됩니다.
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>

              <div className="hidden">
                <div
                  className={
                    isUltraDense
                      ? "grid gap-1.5 md:grid-cols-2 md:divide-x md:divide-[#dbe6f6]"
                      : "grid gap-2.5 md:grid-cols-2 md:divide-x md:divide-[#dbe6f6]"
                  }
                >
                  <div className="space-y-1.5 md:pr-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                      모드
                    </div>
                    <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                      <Link
                        href={makeHref({ nextMode: "ALL", nextPage: 1 })}
                        className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                          mode === "ALL"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        전체글
                      </Link>
                      <Link
                        href={makeHref({ nextMode: "BEST", nextPage: 1 })}
                        className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                          mode === "BEST"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        베스트글
                      </Link>
                    </div>
                  </div>

                  <div
                    className={
                      isUltraDense
                        ? "border-t border-[#dbe6f6] pt-1.5 md:border-t-0 md:pl-4 md:pt-0"
                        : "border-t border-[#dbe6f6] pt-2 md:border-t-0 md:pl-4 md:pt-0"
                    }
                  >
                    {mode === "BEST" ? (
                      <>
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                          기간 선택
                        </div>
                        <div className={isUltraDense ? "grid grid-cols-3 gap-1" : "grid grid-cols-3 gap-1.5"}>
                          {BEST_DAY_OPTIONS.map((day) => (
                            <Link
                              key={day}
                              href={makeHref({ nextDays: day, nextPage: 1 })}
                              className={`border ${isUltraDense ? "px-1.5 py-1 text-[11px]" : "px-2 py-1.5 text-xs"} text-center font-semibold transition ${
                                bestDays === day
                                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                                  : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                              }`}
                            >
                              최근 {day}일
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                          정렬
                        </div>
                        <div className="space-y-1.5">
                          <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                            {FEED_SORT_OPTIONS.map((option) => (
                              <Link
                                key={option.value}
                                href={makeHref({ nextSort: option.value, nextPage: 1 })}
                                className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                                  selectedSort === option.value
                                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                                    : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                                }`}
                              >
                                {option.label}
                              </Link>
                            ))}
                          </div>
                          <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                            <Link
                              href={makeHref({ nextPeriod: null, nextPage: 1 })}
                              className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                                !periodDays
                                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                                  : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                              }`}
                            >
                              전체 기간
                            </Link>
                            {FEED_PERIOD_OPTIONS.map((day) => (
                              <Link
                                key={`desktop-period-${day}`}
                                href={makeHref({ nextPeriod: day, nextPage: 1 })}
                                className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                                  periodDays === day
                                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                                    : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                                }`}
                              >
                                최근 {day}일
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  주요 게시판
                </div>
                <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                  <Link
                    href={makeHref({ nextType: null, nextPage: 1 })}
                    className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                      !type
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    전체
                  </Link>
                  {PRIMARY_POST_TYPES.map((value) => {
                    const isRestricted =
                      !isAuthenticated &&
                      isLoginRequiredPostType(value, loginRequiredTypes);
                    const targetHref = makeHref({ nextType: value, nextPage: 1 });
                    return (
                      <Link
                        key={value}
                        href={isRestricted ? loginHref(targetHref) : targetHref}
                        className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                          type === value
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        {postTypeMeta[value].label}
                        {isRestricted ? " (로그인)" : ""}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-[#dbe6f6] pt-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                    추가 게시판
                  </p>
                  <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                    {secondaryCategoryTypes.map((value) => {
                      const isRestricted =
                        !isAuthenticated &&
                        isLoginRequiredPostType(value, loginRequiredTypes);
                      const targetHref = makeHref({ nextType: value, nextPage: 1 });
                      return (
                        <Link
                          key={`secondary-${value}`}
                          href={isRestricted ? loginHref(targetHref) : targetHref}
                          className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                            type === value
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                          }`}
                        >
                          {postTypeMeta[value].label}
                          {isRestricted ? " (로그인)" : ""}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2 border-t border-[#dbe6f6] pt-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                    관심 동물
                  </p>
                  <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                    <Link
                      href={makeHref({ nextPetTypeId: null, nextPage: 1 })}
                      className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                        !petTypeId
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                      }`}
                    >
                      전체
                    </Link>
                    {communities.items.map((community) => (
                      <Link
                        key={`desktop-community-${community.id}`}
                        href={makeHref({ nextPetTypeId: community.id, nextPage: 1 })}
                        className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                          petTypeId === community.id
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        {community.labelKo}
                      </Link>
                    ))}
                  </div>
                  {isCommonBoardType ? (
                    <p className="mt-1.5 text-[11px] text-[#5d789f]">
                      공용 보드는 관심 동물 필터 없이 전체 노출됩니다.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="hidden">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                범위
              </div>
              <div className={isUltraDense ? "mt-1 grid gap-1" : "mt-1.5 grid gap-1.5"}>
                <Link
                  href={
                    isAuthenticated
                      ? makeHref({ nextScope: PostScope.LOCAL, nextPage: 1 })
                      : loginHref("/feed?scope=LOCAL")
                  }
                  className={`border ${isUltraDense ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"} text-center font-semibold transition ${
                    selectedScope === PostScope.LOCAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  동네
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL, nextPage: 1 })}
                  className={`border ${isUltraDense ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"} text-center font-semibold transition ${
                    selectedScope === PostScope.GLOBAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  온동네
                </Link>
              </div>
              <div
                className={
                  isUltraDense
                    ? "mt-1.5 border-t border-[#dbe6f6] pt-1.5 text-[10px] text-[#4f678d]"
                    : "mt-2 border-t border-[#dbe6f6] pt-2 text-[11px] text-[#4f678d]"
                }
              >
                동네 글 {localCount}건 · 온동네 글 {items.length - localCount}건
              </div>
            </aside>
          </div>
        </section>

        <section id="feed-list" className="animate-fade-up overflow-hidden rounded-2xl border border-[#d9e5f7] bg-white shadow-[0_12px_28px_rgba(30,63,116,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2ebf8] bg-[#f8fbff] px-4 py-2.5 text-xs text-[#4c6f9e] sm:px-5">
            <span className="font-semibold">게시글 목록</span>
            <span className="hidden sm:inline">읽은 글은 연한 색상으로 표시됩니다.</span>
            {!isAuthenticated ? (
              <span>
                반응은 <Link href={loginHref("/feed")} className="font-semibold text-[#2f5da4] hover:text-[#244b86]">로그인</Link> 후 가능
              </span>
            ) : null}
          </div>
          {items.length === 0 ? (
            <EmptyState
              title={mode === "BEST" ? "베스트글이 없습니다" : "게시글이 없습니다"}
              description={
                isGuestTypeBlocked
                  ? "해당 카테고리는 로그인 후 확인할 수 있습니다."
                  : mode === "BEST"
                  ? "선택한 카테고리/범위에서 좋아요가 1개 이상인 글이 아직 없습니다."
                  : "글을 작성하거나 온동네 범위로 전환해서 다른 지역 글을 확인해 주세요."
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
                    : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
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
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
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
                    : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                }`}
              >
                다음
              </Link>
            </div>
          ) : null}
        </section>

         <div className="flex justify-end gap-2">
           <ScrollToTopButton
             className="inline-flex h-9 items-center justify-center rounded-full border border-[#c8daf4] bg-white px-3.5 text-xs font-semibold text-[#315b9a] transition hover:bg-[#f5f9ff]"
           />
           <Link
             href="/posts/new"
             className="inline-flex h-9 items-center justify-center rounded-full border border-[#2f5da4] bg-[#2f5da4] px-4 text-xs font-semibold text-white transition hover:bg-[#274f8c]"
           >
             글쓰기
           </Link>
        </div>

        </div>
      </main>
    </div>
  );
}
