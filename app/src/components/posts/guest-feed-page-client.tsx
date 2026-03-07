"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedInfiniteList, type FeedPostItem } from "@/components/posts/feed-infinite-list";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { EmptyState } from "@/components/ui/empty-state";
import { isCommonBoardPostType } from "@/lib/community-board";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { postTypeMeta } from "@/lib/post-presenter";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedDensity = "DEFAULT" | "ULTRA";
type FeedPeriod = 3 | 7 | 30;
type BestDay = 3 | 7 | 30;

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

type GuestFeedGate = {
  view: "gate";
  gate: {
    title: string;
    description: string;
    primaryLink: string;
    primaryLabel: string;
    secondaryLink: string;
    secondaryLabel: string;
  };
};

type GuestFeedView = {
  view: "feed";
  feed: {
    mode: FeedMode;
    type: PostType | null;
    reviewBoard: boolean;
    reviewCategory: ReviewCategory | null;
    petTypeId: string | null;
    petTypeIds: string[];
    query: string;
    selectedSort: FeedSort;
    selectedSearchIn: FeedSearchIn;
    density: FeedDensity;
    bestDays: BestDay;
    periodDays: FeedPeriod | null;
    isGuestTypeBlocked: boolean;
    feedTitle: string;
    totalPages: number;
    resolvedPage: number;
    feedQueryKey: string;
    items: FeedPostItem[];
    nextCursor: string | null;
  };
};

type GuestFeedResponse =
  | { ok: true; data: GuestFeedGate | GuestFeedView }
  | { ok: false; error: { code: string; message: string } };

export function GuestFeedPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<GuestFeedGate | GuestFeedView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const queryString = searchParams.toString();
  const legacyCommunityId = searchParams.get("communityId")?.trim() ?? "";
  const hasLegacyScope = Boolean(searchParams.get("scope")?.trim());
  const hasPetType = searchParams.getAll("petType").some((value) => value.trim().length > 0);
  const shouldNormalizeLegacy = hasLegacyScope || (legacyCommunityId.length > 0 && !hasPetType);

  useEffect(() => {
    if (!pathname?.startsWith("/feed") || !shouldNormalizeLegacy) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("scope");
    if (legacyCommunityId.length > 0 && !hasPetType) {
      params.set("petType", legacyCommunityId);
    }
    params.delete("communityId");
    const serialized = params.toString();
    router.replace(serialized ? `/feed?${serialized}` : "/feed");
  }, [hasPetType, legacyCommunityId, pathname, router, searchParams, shouldNormalizeLegacy]);

  useEffect(() => {
    if (shouldNormalizeLegacy) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/feed/guest${queryString ? `?${queryString}` : ""}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "force-cache",
          signal: controller.signal,
        });
        const payload = (await response.json()) as GuestFeedResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "피드를 불러오지 못했습니다." : payload.error.message);
        }

        setData(payload.data);
      } catch (error) {
        if (cancelled || (error as { name?: string }).name === "AbortError") {
          return;
        }
        setLoadError(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "피드를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString, shouldNormalizeLegacy]);

  const selectedSortLabel = useMemo(() => {
    if (!data || data.view !== "feed") {
      return "최신";
    }
    return data.feed.selectedSort === "LIKE"
      ? "좋아요"
      : data.feed.selectedSort === "COMMENT"
        ? "댓글"
        : "최신";
  }, [data]);

  if (data?.view === "gate") {
    return (
      <NeighborhoodGateNotice
        title={data.gate.title}
        description={data.gate.description}
        primaryLink={data.gate.primaryLink}
        primaryLabel={data.gate.primaryLabel}
        secondaryLink={data.gate.secondaryLink}
        secondaryLabel={data.gate.secondaryLabel}
      />
    );
  }

  if (isLoading || shouldNormalizeLegacy || !data) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_55%,#fbfdff_100%)] pb-16">
        <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <section className="tp-card overflow-hidden">
            <EmptyState title="피드를 준비 중입니다" description="게시글 목록을 불러오고 있습니다." />
          </section>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_55%,#fbfdff_100%)] pb-16">
        <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <section className="tp-card overflow-hidden">
            <EmptyState title="피드를 불러오지 못했습니다" description={loadError} />
          </section>
        </main>
      </div>
    );
  }

  const {
    mode,
    type,
    reviewBoard,
    reviewCategory,
    petTypeId,
    petTypeIds,
    query,
    selectedSort,
    selectedSearchIn,
    density,
    bestDays,
    periodDays,
    isGuestTypeBlocked,
    feedTitle,
    totalPages,
    resolvedPage,
    feedQueryKey,
    items,
    nextCursor,
  } = data.feed;
  const isUltraDense = density === "ULTRA";
  const loginHref = (nextPath: string) => `/login?next=${encodeURIComponent(nextPath)}`;

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
    const resolvedSort = nextSort == null ? selectedSort : nextSort;
    const resolvedSearchIn = nextSearchIn == null ? selectedSearchIn : nextSearchIn;
    const resolvedDensity = nextDensity == null ? density : nextDensity;
    const effectivePage =
      nextPage === undefined ? (resolvedMode === "BEST" ? resolvedPage : 1) : nextPage;
    const shouldKeepReviewBoard =
      reviewBoard && resolvedType === null && !resolvedReviewCategory;
    const normalizedType = shouldKeepReviewBoard ? PostType.PRODUCT_REVIEW : resolvedType;

    if (normalizedType) {
      params.set("type", normalizedType);
    }
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
    if (resolvedQuery) {
      params.set("q", resolvedQuery);
    }
    if (resolvedSearchIn !== "ALL") {
      params.set("searchIn", resolvedSearchIn);
    }
    if (resolvedDensity === "ULTRA") {
      params.set("density", "ULTRA");
    }
    if (resolvedMode === "BEST") {
      params.set("mode", "BEST");
      params.set("days", String(resolvedDays));
    } else if (resolvedSort !== "LATEST") {
      params.set("sort", resolvedSort);
      if (resolvedPeriod) {
        params.set("period", String(resolvedPeriod));
      }
    } else if (resolvedPeriod) {
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
                <span className="rounded border border-[#d2e0f3] bg-white px-1.5 py-0.5">
                  {selectedSortLabel}
                </span>
                <span className="rounded border border-[#d2e0f3] bg-white px-1.5 py-0.5">
                  {mode === "BEST" ? "베스트" : "전체"}
                </span>
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
                initialItems={items}
                initialNextCursor={mode === "ALL" ? nextCursor : null}
                mode={mode}
                disableLoadMore={mode !== "ALL"}
                apiPath="/api/feed/guest"
                preferGuestDetail
                query={{
                  type: type ?? undefined,
                  scope: "GLOBAL",
                  petTypeId: petTypeId ?? undefined,
                  petTypeIds,
                  reviewCategory: reviewCategory ?? undefined,
                  q: query || undefined,
                  searchIn: selectedSearchIn,
                  sort: selectedSort,
                  days: periodDays ?? undefined,
                  personalized: false,
                }}
                queryKey={feedQueryKey}
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
            <ScrollToTopButton className="tp-btn-soft inline-flex h-9 items-center justify-center px-3.5 text-xs font-semibold" />
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
