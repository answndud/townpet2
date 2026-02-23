import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
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
import { isLoginRequiredPostType } from "@/lib/post-access";
import { postTypeMeta } from "@/lib/post-presenter";
import { postListSchema } from "@/lib/validations/post";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listBestPosts, listPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedPersonalized = "0" | "1";
type FeedDensity = "DEFAULT" | "ULTRA";
const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const MAX_DEBUG_DELAY_MS = 5_000;
const FEED_SORT_OPTIONS: ReadonlyArray<{ value: FeedSort; label: string }> = [
  { value: "LATEST", label: "최신순" },
  { value: "LIKE", label: "좋아요순" },
  { value: "COMMENT", label: "댓글순" },
];
type BestDay = (typeof BEST_DAY_OPTIONS)[number];

const SEARCH_IN_LABEL: Record<FeedSearchIn, string> = {
  ALL: "전체",
  TITLE: "제목",
  CONTENT: "내용",
  AUTHOR: "작성자",
};

const PRIMARY_CATEGORY_TYPES: PostType[] = [
  PostType.FREE_POST,
  PostType.HOSPITAL_REVIEW,
  PostType.PLACE_REVIEW,
  PostType.WALK_ROUTE,
  PostType.QA_QUESTION,
];

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
    q?: string;
    mode?: string;
    days?: string;
    sort?: string;
    searchIn?: string;
    personalized?: string;
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
  const isAuthenticated = Boolean(user);
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes().catch((error) => {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  });
  const popularSearchTerms = await getPopularSearchTerms(8).catch((error) => {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  });
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const resolvedParams = (await searchParams) ?? {};
  await maybeDebugDelay(resolvedParams.debugDelayMs);
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const type = parsedParams.success ? parsedParams.data.type : undefined;
  const scope = parsedParams.success ? parsedParams.data.scope : undefined;
  const selectedScope = scope ?? PostScope.GLOBAL;
  const effectiveScope = isAuthenticated ? selectedScope : PostScope.GLOBAL;
  const mode = toFeedMode(resolvedParams.mode);
  const bestDays = toBestDay(resolvedParams.days);
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

  const cursor = parsedParams.success ? parsedParams.data.cursor : undefined;
  const limit = parsedParams.success ? parsedParams.data.limit : 20;
  const query = parsedParams.success ? parsedParams.data.q?.trim() ?? "" : "";

  const neighborhoodId =
    effectiveScope === PostScope.LOCAL
      ? primaryNeighborhood?.neighborhood.id
      : undefined;

  const posts =
    mode === "ALL" && !isGuestTypeBlocked
      ? await listPosts({
          limit,
          cursor,
          type,
          scope: effectiveScope,
          q: query || undefined,
          searchIn: selectedSearchIn,
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
          days: bestDays,
          type,
          scope: effectiveScope,
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
  const nextCursor = mode === "ALL" ? posts.nextCursor : null;
  const localCount = items.filter((post) => post.scope === PostScope.LOCAL).length;
  const secondaryCategoryTypes = Object.values(PostType).filter(
    (value) => !PRIMARY_CATEGORY_TYPES.includes(value),
  );
  const feedTitle = type ? `${postTypeMeta[type].label} 게시판` : "전체 게시판";
  const scopeLabel = effectiveScope === PostScope.LOCAL ? "동네" : "온동네";
  const modeLabel = mode === "BEST" ? "베스트글" : "전체글";
  const sortLabel =
    mode === "BEST"
      ? `최근 ${bestDays}일`
      : FEED_SORT_OPTIONS.find((option) => option.value === selectedSort)?.label ?? "최신순";
  const loginHref = (nextPath: string) =>
    `/login?next=${encodeURIComponent(nextPath)}`;
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    selectedSort,
    selectedSearchIn,
    selectedPersonalized,
    density,
    bestDays,
    query || "__EMPTY__",
    limit,
  ].join("|");
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
    neighborhood: post.neighborhood
      ? {
          id: post.neighborhood.id,
          name: post.neighborhood.name,
          city: post.neighborhood.city,
          district: post.neighborhood.district,
        }
      : null,
    images: post.images.map((image) => ({
      id: image.id,
      url: image.url,
      order: image.order,
    })),
    reactions: post.reactions?.map((reaction) => ({ type: reaction.type })) ?? [],
  }));

  const makeHref = ({
    nextType,
    nextScope,
    nextQuery,
    nextCursor,
    nextMode,
    nextDays,
    nextSort,
    nextSearchIn,
    nextPersonalized,
    nextDensity,
  }: {
    nextType?: PostType | null;
    nextScope?: PostScope | null;
    nextQuery?: string | null;
    nextCursor?: string | null;
    nextMode?: FeedMode | null;
    nextDays?: BestDay | null;
    nextSort?: FeedSort | null;
    nextSearchIn?: FeedSearchIn | null;
    nextPersonalized?: FeedPersonalized | null;
    nextDensity?: FeedDensity | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedScope = nextScope === undefined ? selectedScope : nextScope;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;
    const resolvedMode = nextMode === undefined ? mode : nextMode;
    const resolvedDays = nextDays === undefined ? bestDays : nextDays;
    const resolvedSort = nextSort === undefined ? selectedSort : nextSort;
    const resolvedSearchIn =
      nextSearchIn === undefined ? selectedSearchIn : nextSearchIn;
    const resolvedPersonalized =
      nextPersonalized === undefined ? selectedPersonalized : nextPersonalized;
    const resolvedDensity = nextDensity === undefined ? density : nextDensity;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
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
    }
    if (limit) params.set("limit", String(limit));
    if (resolvedMode === "ALL" && nextCursor) params.set("cursor", nextCursor);

    const serialized = params.toString();
    return serialized ? `/feed?${serialized}` : "/feed";
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#eef4ff_100%)] pb-16">
      <main
        className={`mx-auto flex w-full max-w-[1320px] flex-col px-4 sm:px-6 lg:px-10 ${
          isUltraDense ? "gap-1.5 py-2 sm:gap-2" : "gap-2 py-3 sm:gap-3"
        }`}
      >
        <div className={isUltraDense ? "space-y-2" : "space-y-3"}>
          <header
          className={`animate-float-in border border-[#c8d7ef] bg-[linear-gradient(180deg,#f7faff_0%,#edf3ff_100%)] ${
            isUltraDense ? "px-2.5 py-1.5 sm:px-3 sm:py-2" : "px-3 py-2 sm:px-4 sm:py-2.5"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#3f5f90]">
                타운펫 커뮤니티
              </p>
              <h1
                className={
                  isUltraDense
                    ? "mt-0.5 text-base font-bold tracking-tight text-[#10284a] sm:text-lg"
                    : "mt-0.5 text-lg font-bold tracking-tight text-[#10284a] sm:text-xl"
                }
                >
                  {feedTitle}
                </h1>
                <p className="mt-1 text-xs text-[#49648c]">
                  총 {items.length}건을 기준으로 현재 선택된 필터를 바로 확인할 수 있습니다.
                </p>
              </div>
            <div className="flex items-center gap-1.5 text-xs text-[#4f678d]">
              <div className="border border-[#d4e1f3] bg-white px-2.5 py-1">
                {mode === "BEST" ? "베스트글" : "전체글"} {items.length}건
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 font-semibold text-[#2f548f]">
              {scopeLabel}
            </span>
            <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 font-semibold text-[#2f548f]">
              {modeLabel}
            </span>
            <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 font-semibold text-[#2f548f]">
              {sortLabel}
            </span>
            <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 text-[#355885]">
              검색: {SEARCH_IN_LABEL[selectedSearchIn]}
            </span>
            {type ? (
              <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 text-[#355885]">
                카테고리: {postTypeMeta[type].label}
              </span>
            ) : null}
            {query ? (
              <span className="rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 text-[#355885]">
                검색어: &quot;{query}&quot;
              </span>
            ) : null}
          </div>
        </header>

        <section
          className={`animate-fade-up border border-[#c8d7ef] bg-white ${
            isUltraDense ? "p-1.5 sm:p-2" : "p-2.5 sm:p-3"
          }`}
        >
          {isGuestLocalBlocked ? (
            <div className="mb-3 border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
              동네(Local) 피드는 로그인 후 이용할 수 있습니다.{" "}
              <Link
                href={loginHref("/feed?scope=LOCAL")}
                className="font-semibold text-[#2f5da4] underline underline-offset-2"
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
                className="font-semibold text-[#2f5da4] underline underline-offset-2"
              >
                로그인하기
              </Link>
            </div>
          ) : null}
          {!isAuthenticated ? (
            <div className="mb-3 border border-[#bfd0ec] bg-[#f6f9ff] px-3 py-2 text-sm text-[#2f548f]">
              반응 기능은 로그인 후 이용할 수 있습니다. <Link href={loginHref("/feed")} className="font-semibold underline underline-offset-2">로그인하기</Link>
            </div>
          ) : null}
          <div
            className={`grid ${
              isUltraDense
                ? "gap-1.5 lg:grid-cols-[minmax(0,1fr)_184px]"
                : "gap-2.5 lg:grid-cols-[minmax(0,1fr)_220px]"
            }`}
          >
            <div className={isUltraDense ? "space-y-1.5" : "space-y-2"}>
              <FeedSearchForm
                actionPath="/feed"
                query={query}
                searchIn={selectedSearchIn}
                personalized={selectedPersonalized}
                type={type}
                scope={selectedScope}
                mode={mode}
                days={bestDays}
                sort={selectedSort}
                resetHref={makeHref({ nextQuery: null, nextCursor: null })}
                popularTerms={popularSearchTerms}
                density={density}
                showKeywordChips
              />

              <details open className="rounded-sm border border-[#dbe6f6] bg-[#f8fbff] p-2 lg:hidden">
                <summary className="cursor-pointer list-none text-xs font-semibold text-[#2f548f]">
                  필터
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="border border-[#dbe6f6] bg-white p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                      모드
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Link
                        href={makeHref({ nextMode: "ALL", nextCursor: null })}
                        className={`border px-2.5 py-0.5 text-xs font-semibold transition ${
                          mode === "ALL"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        전체글
                      </Link>
                      <Link
                        href={makeHref({ nextMode: "BEST", nextCursor: null })}
                        className={`border px-2.5 py-0.5 text-xs font-semibold transition ${
                          mode === "BEST"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
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
                              href={makeHref({ nextDays: day, nextCursor: null })}
                              className={`border px-2 py-1.5 text-center text-xs font-semibold transition ${
                                bestDays === day
                                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                                  : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                              }`}
                            >
                              최근 {day}일
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {FEED_SORT_OPTIONS.map((option) => (
                            <Link
                              key={`mobile-sort-${option.value}`}
                              href={makeHref({ nextSort: option.value, nextCursor: null })}
                              className={`border px-2.5 py-0.5 text-xs font-semibold transition ${
                                selectedSort === option.value
                                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                                  : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                              }`}
                            >
                              {option.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-[#dbe6f6] bg-white p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                      분류
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Link
                        href={makeHref({ nextType: null, nextCursor: null })}
                        className={`border px-2.5 py-0.5 text-xs font-medium transition ${
                          !type
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        전체
                      </Link>
                      {PRIMARY_CATEGORY_TYPES.map((value) => {
                        const isRestricted =
                          !isAuthenticated &&
                          isLoginRequiredPostType(value, loginRequiredTypes);
                        const targetHref = makeHref({ nextType: value, nextCursor: null });
                        return (
                          <Link
                            key={`mobile-primary-${value}`}
                            href={isRestricted ? loginHref(targetHref) : targetHref}
                            className={`border px-2.5 py-0.5 text-xs font-medium transition ${
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
                </div>
              </details>

              <details className="rounded-sm border border-[#dbe6f6] bg-[#f8fbff] p-2 lg:hidden">
                <summary className="cursor-pointer list-none text-xs font-semibold text-[#2f548f]">
                  범위
                </summary>
                <div className="mt-2 grid gap-1.5">
                  <Link
                    href={
                      isAuthenticated
                        ? makeHref({ nextScope: PostScope.LOCAL, nextCursor: null })
                        : loginHref("/feed?scope=LOCAL")
                    }
                    className={`border px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                      selectedScope === PostScope.LOCAL
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    동네
                  </Link>
                  <Link
                    href={makeHref({ nextScope: PostScope.GLOBAL, nextCursor: null })}
                    className={`border px-2.5 py-1.5 text-center text-xs font-semibold transition ${
                      selectedScope === PostScope.GLOBAL
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    온동네
                  </Link>
                  <p className="mt-1 border-t border-[#dbe6f6] pt-1.5 text-[11px] text-[#4f678d]">
                    동네 글 {localCount}건 · 온동네 글 {items.length - localCount}건
                  </p>
                </div>
              </details>

              <div
                className={
                  isUltraDense
                    ? "hidden border border-[#dbe6f6] bg-[#f8fbff] p-1.5 lg:block"
                    : "hidden border border-[#dbe6f6] bg-[#f8fbff] p-2 lg:block"
                }
              >
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
                        href={makeHref({ nextMode: "ALL", nextCursor: null })}
                        className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-semibold transition ${
                          mode === "ALL"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        전체글
                      </Link>
                      <Link
                        href={makeHref({ nextMode: "BEST", nextCursor: null })}
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
                              href={makeHref({ nextDays: day, nextCursor: null })}
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
                        <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                          {FEED_SORT_OPTIONS.map((option) => (
                            <Link
                              key={option.value}
                              href={makeHref({ nextSort: option.value, nextCursor: null })}
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
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={
                  isUltraDense
                    ? "hidden border border-[#dbe6f6] bg-[#f8fbff] p-1.5 lg:block"
                    : "hidden border border-[#dbe6f6] bg-[#f8fbff] p-2.5 lg:block"
                }
              >
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  분류
                </div>
                <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                  <Link
                    href={makeHref({ nextType: null, nextCursor: null })}
                    className={`border ${isUltraDense ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} font-medium transition ${
                      !type
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    전체
                  </Link>
                  {PRIMARY_CATEGORY_TYPES.map((value) => {
                    const isRestricted =
                      !isAuthenticated &&
                      isLoginRequiredPostType(value, loginRequiredTypes);
                    const targetHref = makeHref({ nextType: value, nextCursor: null });
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
                    기타
                  </p>
                  <div className={isUltraDense ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
                    {secondaryCategoryTypes.map((value) => {
                      const isRestricted =
                        !isAuthenticated &&
                        isLoginRequiredPostType(value, loginRequiredTypes);
                      const targetHref = makeHref({ nextType: value, nextCursor: null });
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
              </div>
            </div>

            <aside
              className={
                isUltraDense
                  ? "hidden border border-[#dbe6f6] bg-[#f8fbff] p-1.5 lg:block"
                  : "hidden border border-[#dbe6f6] bg-[#f8fbff] p-2.5 lg:block"
              }
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                범위
              </div>
              <div className={isUltraDense ? "mt-1 grid gap-1" : "mt-1.5 grid gap-1.5"}>
                <Link
                  href={
                    isAuthenticated
                      ? makeHref({ nextScope: PostScope.LOCAL, nextCursor: null })
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
                  href={makeHref({ nextScope: PostScope.GLOBAL, nextCursor: null })}
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

        <section className="animate-fade-up border border-[#c8d7ef] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dbe6f6] bg-[#f8fbff] px-4 py-2 text-xs text-[#3d5f8f] sm:px-5">
            <span className="font-semibold">게시글 목록</span>
            <span>읽은 글은 연한 색상으로 표시됩니다.</span>
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
                    : isAuthenticated
                      ? "/posts/new"
                      : loginHref("/posts/new")
              }
              actionLabel={
                isGuestTypeBlocked
                  ? "로그인하고 보기"
                  : mode === "BEST"
                    ? "전체글 보기"
                    : isAuthenticated
                      ? "첫 글 작성하기"
                      : "로그인하고 글쓰기"
              }
            />
          ) : (
            <FeedInfiniteList
              initialItems={initialFeedItems}
              initialNextCursor={nextCursor}
              mode={mode}
              query={{
                limit,
                type,
                scope: effectiveScope,
                  q: query || undefined,
                  searchIn: selectedSearchIn,
                  sort: selectedSort,
                  personalized: usePersonalizedFeed,
                }}
              queryKey={feedQueryKey}
            />
          )}
        </section>

        <div className="flex justify-end gap-1.5">
          <ScrollToTopButton
            className="inline-flex h-8 items-center justify-center border border-[#b9cbeb] bg-white px-3 text-xs font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff]"
          />
          <Link
            href={isAuthenticated ? "/posts/new" : loginHref("/posts/new")}
            className="inline-flex h-8 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
          >
            {isAuthenticated ? "글쓰기" : "로그인 후 글쓰기"}
          </Link>
        </div>

        </div>
      </main>
    </div>
  );
}
