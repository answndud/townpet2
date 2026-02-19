import Link from "next/link";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
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
const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const MAX_DEBUG_DELAY_MS = 5_000;
const FEED_SORT_OPTIONS: ReadonlyArray<{ value: FeedSort; label: string }> = [
  { value: "LATEST", label: "최신순" },
  { value: "LIKE", label: "좋아요순" },
  { value: "COMMENT", label: "댓글순" },
];
type BestDay = (typeof BEST_DAY_OPTIONS)[number];

type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    q?: string;
    mode?: string;
    days?: string;
    sort?: string;
    searchIn?: string;
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

export default async function Home({ searchParams }: HomePageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId ? await getUserWithNeighborhoods(userId) : null;
  const isAuthenticated = Boolean(user);
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
  const popularSearchTerms = await getPopularSearchTerms(8);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const resolvedParams = (await searchParams) ?? {};
  await maybeDebugDelay(resolvedParams.debugDelayMs);
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const type = parsedParams.success ? parsedParams.data.type : undefined;
  const scope = parsedParams.success ? parsedParams.data.scope : undefined;
  const selectedScope = scope ?? (isAuthenticated ? PostScope.LOCAL : PostScope.GLOBAL);
  const effectiveScope = isAuthenticated ? selectedScope : PostScope.GLOBAL;
  const mode = toFeedMode(resolvedParams.mode);
  const bestDays = toBestDay(resolvedParams.days);
  const selectedSort = toFeedSort(resolvedParams.sort);
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
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
        })
      : [];

  const items = mode === "BEST" ? bestItems : posts.items;
  const nextCursor = mode === "ALL" ? posts.nextCursor : null;
  const localCount = items.filter((post) => post.scope === PostScope.LOCAL).length;
  const loginHref = (nextPath: string) =>
    `/login?next=${encodeURIComponent(nextPath)}`;
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    selectedSort,
    selectedSearchIn,
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
  }: {
    nextType?: PostType | null;
    nextScope?: PostScope | null;
    nextQuery?: string | null;
    nextCursor?: string | null;
    nextMode?: FeedMode | null;
    nextDays?: BestDay | null;
    nextSort?: FeedSort | null;
    nextSearchIn?: FeedSearchIn | null;
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

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (resolvedSearchIn && resolvedSearchIn !== "ALL") {
      params.set("searchIn", resolvedSearchIn);
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
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="animate-float-in border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">
                타운펫 커뮤니티
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
                전체 게시판
              </h1>
              <p className="mt-2 text-sm text-[#4f678d] sm:text-base">
                전체글/베스트글을 전환하고 카테고리별로 바로 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-[#4f678d]">
              <div className="border border-[#d4e1f3] bg-white px-3 py-1.5">
                {mode === "BEST" ? "베스트글" : "전체글"} {items.length}건
              </div>
              <Link
                href={isAuthenticated ? "/posts/new" : loginHref("/posts/new")}
                className="inline-flex h-10 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-4 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
              >
                {isAuthenticated ? "글쓰기" : "로그인 후 글쓰기"}
              </Link>
            </div>
          </div>
        </header>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white p-4 sm:p-5">
          {isGuestLocalBlocked ? (
            <div className="mb-4 border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
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
            <div className="mb-4 border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
              선택한 카테고리({postTypeMeta[type].label})는 로그인 후 열람할 수 있습니다.{" "}
              <Link
                href={loginHref(`/feed?type=${type}`)}
                className="font-semibold text-[#2f5da4] underline underline-offset-2"
              >
                로그인하기
              </Link>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <FeedSearchForm
                actionPath="/feed"
                query={query}
                searchIn={selectedSearchIn}
                type={type}
                scope={selectedScope}
                mode={mode}
                days={bestDays}
                sort={selectedSort}
                resetHref={makeHref({ nextQuery: null, nextCursor: null })}
                popularTerms={popularSearchTerms}
              />

              <div className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <div className="grid gap-3 md:grid-cols-2 md:divide-x md:divide-[#dbe6f6]">
                  <div className="space-y-2 md:pr-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                      피드
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={makeHref({ nextMode: "ALL", nextCursor: null })}
                        className={`border px-3 py-1 text-xs font-semibold transition ${
                          mode === "ALL"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        전체글
                      </Link>
                      <Link
                        href={makeHref({ nextMode: "BEST", nextCursor: null })}
                        className={`border px-3 py-1 text-xs font-semibold transition ${
                          mode === "BEST"
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                        }`}
                      >
                        베스트글
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-[#dbe6f6] pt-3 md:border-t-0 md:pl-4 md:pt-0">
                    {mode === "BEST" ? (
                      <>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                          베스트 기간
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {BEST_DAY_OPTIONS.map((day) => (
                            <Link
                              key={day}
                              href={makeHref({ nextDays: day, nextCursor: null })}
                              className={`border px-2 py-2 text-center text-xs font-semibold transition ${
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
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                          정렬
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {FEED_SORT_OPTIONS.map((option) => (
                            <Link
                              key={option.value}
                              href={makeHref({ nextSort: option.value, nextCursor: null })}
                              className={`border px-3 py-1 text-xs font-semibold transition ${
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

              <div className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  카테고리
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={makeHref({ nextType: null, nextCursor: null })}
                    className={`border px-3 py-1 text-xs font-medium transition ${
                      !type
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    전체
                  </Link>
                  {Object.values(PostType).map((value) => {
                    const isRestricted =
                      !isAuthenticated &&
                      isLoginRequiredPostType(value, loginRequiredTypes);
                    const targetHref = makeHref({ nextType: value, nextCursor: null });
                    return (
                    <Link
                      key={value}
                      href={isRestricted ? loginHref(targetHref) : targetHref}
                      className={`border px-3 py-1 text-xs font-medium transition ${
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

            <aside className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                범위
              </div>
              <div className="mt-2 grid gap-2">
                <Link
                  href={
                    isAuthenticated
                      ? makeHref({ nextScope: PostScope.LOCAL, nextCursor: null })
                      : loginHref("/feed?scope=LOCAL")
                  }
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.LOCAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  동네
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL, nextCursor: null })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.GLOBAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  온동네
                </Link>
              </div>
              <div className="mt-3 border-t border-[#dbe6f6] pt-3 text-xs text-[#4f678d]">
                동네 글 {localCount}건 · 온동네 글 {items.length - localCount}건
              </div>
            </aside>
          </div>
        </section>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white">
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
              isAuthenticated={isAuthenticated}
              query={{
                limit,
                type,
                scope: effectiveScope,
                q: query || undefined,
                searchIn: selectedSearchIn,
                sort: selectedSort,
              }}
              queryKey={feedQueryKey}
            />
          )}
        </section>
      </main>
    </div>
  );
}
