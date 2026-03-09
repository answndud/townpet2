"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostType } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import type {
  FeedAudienceSourceValue,
  FeedPersonalizationEventValue,
  FeedPersonalizationSurfaceValue,
} from "@/lib/feed-personalization-metrics";
import {
  sendFeedPersonalizationMetric,
} from "@/lib/feed-personalization-tracking";
import {
  getPostSignals,
  postTypeMeta,
} from "@/lib/post-presenter";
import {
  buildFeedStatsLabel,
} from "@/lib/feed-list-presenter";
import { resolveUserDisplayName } from "@/lib/user-display";
import type { ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedReactionType = "LIKE" | "DISLIKE";
type FeedScope = "LOCAL" | "GLOBAL";
type FeedStatus = "ACTIVE" | "HIDDEN" | "DELETED";

export type FeedPostItem = {
  id: string;
  type: PostType;
  scope: FeedScope;
  status: FeedStatus;
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    nickname: string | null;
    image?: string | null;
  };
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  neighborhood: {
    id: string;
    name: string;
    city: string;
    district: string;
  } | null;
  petType?: {
    id: string;
    labelKo: string;
    categoryLabelKo: string;
  } | null;
  images: Array<{
    id: string;
  }>;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    status?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerDate?: string | Date | null;
    status?: string | null;
  } | null;
  isBookmarked?: boolean | null;
  reactions?: Array<{
    type: FeedReactionType;
  }>;
};

type FeedQueryParams = {
  type?: PostType;
  scope: FeedScope;
  petTypeId?: string;
  petTypeIds?: string[];
  reviewCategory?: ReviewCategory;
  q?: string;
  searchIn?: FeedSearchIn;
  sort?: FeedSort;
  days?: 3 | 7 | 30;
  personalized?: boolean;
};

type FeedApiSuccess = {
  ok: true;
  data: {
    items: FeedPostItem[];
    nextCursor: string | null;
  };
};

type FeedApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type FeedInfiniteListProps = {
  initialItems: FeedPostItem[];
  initialNextCursor: string | null;
  mode: FeedMode;
  query: FeedQueryParams;
  queryKey: string;
  disableLoadMore?: boolean;
  apiPath?: string;
  preferGuestDetail?: boolean;
  adConfig?: {
    audienceKey: string;
    headline: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    sessionCap: number;
    dailyCap: number;
  };
  personalizationTracking?: {
    surface: FeedPersonalizationSurfaceValue;
    audienceKey?: string | null;
    breedCode?: string | null;
    audienceSource: FeedAudienceSourceValue;
  };
};

const SCROLL_RESTORE_TTL_MS = 30 * 60 * 1000;
const READ_POSTS_STORAGE_KEY = "feed:read-posts:v1";
const MAX_READ_POSTS = 500;
const AD_DAILY_STORAGE_KEY = "feed:ad-impressions:daily:v1";
const AD_SESSION_STORAGE_KEY = "feed:ad-impressions:session:v1";

const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

const volunteerStatusLabel: Record<string, string> = {
  OPEN: "모집 중",
  FULL: "정원 마감",
  CLOSED: "종료",
  CANCELLED: "취소",
};

type StoredReadPost = {
  id: string;
  ts: number;
};

function parseErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "게시글을 더 불러오지 못했습니다.";
}

function formatListDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
}

function parseReadPosts(raw: string | null): StoredReadPost[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed
      .filter(
        (entry): entry is StoredReadPost =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as StoredReadPost).id === "string" &&
          typeof (entry as StoredReadPost).ts === "number" &&
          Number.isFinite((entry as StoredReadPost).ts),
      )
      .sort((a, b) => b.ts - a.ts);

    const unique = new Set<string>();
    const deduped: StoredReadPost[] = [];

    for (const entry of sanitized) {
      if (unique.has(entry.id)) {
        continue;
      }
      unique.add(entry.id);
      deduped.push(entry);
      if (deduped.length >= MAX_READ_POSTS) {
        break;
      }
    }

    return deduped;
  } catch {
    return [];
  }
}

export function FeedInfiniteList({
  initialItems,
  initialNextCursor,
  mode,
  query,
  queryKey,
  disableLoadMore = false,
  apiPath = "/api/posts",
  preferGuestDetail,
  adConfig,
  personalizationTracking,
}: FeedInfiniteListProps) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoreDoneRef = useRef(false);
  const scrollStorageKey = useMemo(() => `feed:scroll:${queryKey}`, [queryKey]);
  const [relativeNow, setRelativeNow] = useState<number | null>(null);
  const [showAdSlot, setShowAdSlot] = useState(false);
  const trackedViewKeyRef = useRef<string | null>(null);
  const trackedAdKeyRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
    setIsLoading(false);
    setLoadError(null);
    restoreDoneRef.current = false;
  }, [queryKey, initialItems, initialNextCursor]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !adConfig ||
      mode !== "ALL" ||
      initialItems.length < 5
    ) {
      setShowAdSlot(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyRaw = window.localStorage.getItem(AD_DAILY_STORAGE_KEY);
    const sessionRaw = window.sessionStorage.getItem(AD_SESSION_STORAGE_KEY);

    let daily: Record<string, { date: string; count: number }> = {};
    let session: Record<string, number> = {};

    try {
      daily = dailyRaw ? (JSON.parse(dailyRaw) as Record<string, { date: string; count: number }>) : {};
    } catch {
      daily = {};
    }

    try {
      session = sessionRaw ? (JSON.parse(sessionRaw) as Record<string, number>) : {};
    } catch {
      session = {};
    }

    const dailyEntry = daily[adConfig.audienceKey];
    const dailyCount = dailyEntry?.date === today ? dailyEntry.count : 0;
    const sessionCount = session[adConfig.audienceKey] ?? 0;

    if (dailyCount >= adConfig.dailyCap || sessionCount >= adConfig.sessionCap) {
      setShowAdSlot(false);
      return;
    }

    daily[adConfig.audienceKey] = {
      date: today,
      count: dailyCount + 1,
    };
    session[adConfig.audienceKey] = sessionCount + 1;

    window.localStorage.setItem(AD_DAILY_STORAGE_KEY, JSON.stringify(daily));
    window.sessionStorage.setItem(AD_SESSION_STORAGE_KEY, JSON.stringify(session));
    setShowAdSlot(true);
  }, [adConfig, initialItems.length, mode, queryKey]);

  useEffect(() => {
    setRelativeNow(Date.now());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || restoreDoneRef.current) {
      return;
    }

    const raw = window.sessionStorage.getItem(scrollStorageKey);
    if (!raw) {
      restoreDoneRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { y?: number; ts?: number };
      if (
        typeof parsed.y === "number" &&
        Number.isFinite(parsed.y) &&
        typeof parsed.ts === "number" &&
        Date.now() - parsed.ts <= SCROLL_RESTORE_TTL_MS
      ) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: parsed.y, behavior: "auto" });
        });
      }
    } catch {
      // ignore malformed payload
    }

    restoreDoneRef.current = true;
  }, [scrollStorageKey]);

  const trackPersonalizationEvent = useCallback(
    (
      event: FeedPersonalizationEventValue,
      options?: {
        postId?: string | null;
      },
    ) => {
      if (!query.personalized || !personalizationTracking) {
        return;
      }

      void sendFeedPersonalizationMetric({
        surface: personalizationTracking.surface,
        event,
        audienceKey: personalizationTracking.audienceKey,
        breedCode: personalizationTracking.breedCode,
        audienceSource: personalizationTracking.audienceSource,
        postId: options?.postId,
      });
    },
    [personalizationTracking, query.personalized],
  );

  useEffect(() => {
    if (!query.personalized || !personalizationTracking || items.length === 0) {
      trackedViewKeyRef.current = null;
      return;
    }

    const viewKey = [
      queryKey,
      personalizationTracking.surface,
      personalizationTracking.audienceKey ?? "NONE",
      personalizationTracking.audienceSource,
    ].join("|");

    if (trackedViewKeyRef.current === viewKey) {
      return;
    }

    trackedViewKeyRef.current = viewKey;
    trackPersonalizationEvent("VIEW");
  }, [
    items.length,
    personalizationTracking,
    query.personalized,
    queryKey,
    trackPersonalizationEvent,
  ]);

  useEffect(() => {
    if (
      !showAdSlot ||
      !adConfig ||
      !query.personalized ||
      !personalizationTracking
    ) {
      trackedAdKeyRef.current = null;
      return;
    }

    const adKey = [
      queryKey,
      adConfig.audienceKey,
      personalizationTracking.surface,
      personalizationTracking.audienceSource,
    ].join("|");

    if (trackedAdKeyRef.current === adKey) {
      return;
    }

    trackedAdKeyRef.current = adKey;
    trackPersonalizationEvent("AD_IMPRESSION");
  }, [
    adConfig,
    personalizationTracking,
    query.personalized,
    queryKey,
    showAdSlot,
    trackPersonalizationEvent,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncReadPosts = () => {
      const entries = parseReadPosts(
        window.localStorage.getItem(READ_POSTS_STORAGE_KEY),
      );
      setReadPostIds(new Set(entries.map((entry) => entry.id)));
    };

    syncReadPosts();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== READ_POSTS_STORAGE_KEY) {
        return;
      }
      syncReadPosts();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const markPostAsRead = useCallback((postId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    setReadPostIds((prev) => {
      if (prev.has(postId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    const current = parseReadPosts(window.localStorage.getItem(READ_POSTS_STORAGE_KEY));
    const next = [{ id: postId, ts: Date.now() }, ...current.filter((item) => item.id !== postId)]
      .slice(0, MAX_READ_POSTS);
    window.localStorage.setItem(READ_POSTS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;
    const saveScroll = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(
          scrollStorageKey,
          JSON.stringify({
            y: window.scrollY,
            ts: Date.now(),
          }),
        );
        frameId = null;
      });
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("pagehide", saveScroll);

    return () => {
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("pagehide", saveScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [scrollStorageKey]);

  const loadMore = useCallback(async () => {
    if (mode !== "ALL" || !nextCursor || isLoading) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("scope", query.scope);

      if (query.type) {
        params.set("type", query.type);
      }
      if (query.petTypeIds && query.petTypeIds.length > 0) {
        for (const petTypeId of query.petTypeIds) {
          params.append("petType", petTypeId);
        }
      } else if (query.petTypeId) {
        params.set("petType", query.petTypeId);
      }
      if (query.reviewCategory) {
        params.set("review", query.reviewCategory);
      }
      if (query.q) {
        params.set("q", query.q);
      }
      if (query.searchIn && query.searchIn !== "ALL") {
        params.set("searchIn", query.searchIn);
      }
      if (query.sort && query.sort !== "LATEST") {
        params.set("sort", query.sort);
      }
      if (query.days) {
        params.set("period", String(query.days));
      }
      if (query.personalized) {
        params.set("personalized", "1");
      }

      const response = await fetch(`${apiPath}?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as FeedApiSuccess | FeedApiError;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? "게시글을 더 불러오지 못했습니다." : payload.error.message,
        );
      }

      setItems((prev) => {
        const merged = [...prev];
        const seen = new Set(prev.map((item) => item.id));
        for (const item of payload.data.items) {
          if (seen.has(item.id)) {
            continue;
          }
          merged.push(item);
          seen.add(item.id);
        }
        return merged;
      });
      setNextCursor(payload.data.nextCursor);
    } catch (error) {
      setLoadError(parseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    mode,
    nextCursor,
    query.q,
    query.petTypeId,
    query.petTypeIds,
    query.reviewCategory,
    query.scope,
    query.searchIn,
    query.sort,
    query.type,
    query.days,
    query.personalized,
    apiPath,
  ]);

  useEffect(() => {
    if (mode !== "ALL" || !nextCursor || isLoading) {
      return;
    }

    const target = sentinelRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        rootMargin: "600px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoading, loadMore, mode, nextCursor]);

  useEffect(() => {
    if (preferGuestDetail) {
      const targets = items.slice(0, 3);
      for (const post of targets) {
        router.prefetch(`/posts/${post.id}/guest`);
      }
      return;
    }

    const targets = items.slice(0, 2);
    for (const post of targets) {
      router.prefetch(`/posts/${post.id}`);
    }
  }, [items, preferGuestDetail, router]);

  return (
    <>
      <div className="divide-y divide-[#e7eef9]" data-testid="feed-post-list">
        {items.map((post, index) => {
          const meta = postTypeMeta[post.type];
          const signals = getPostSignals({
            title: post.title,
            content: post.content,
            imageCount: post.images.length,
          });
          const locationLabel = post.neighborhood
            ? `${post.neighborhood.city} ${post.neighborhood.name}`
            : null;
          const petTypeLabel = post.petType
            ? post.petType.categoryLabelKo === post.petType.labelKo
              ? post.petType.labelKo
              : `${post.petType.categoryLabelKo} · ${post.petType.labelKo}`
            : null;
          const statsLabel = buildFeedStatsLabel({
            createdAt: post.createdAt,
            relativeNow,
            viewCount: post.viewCount,
            reactionCount: post.likeCount + post.dislikeCount,
          });
          const adoptionSummary = post.adoptionListing
            ? [
                post.adoptionListing.shelterName,
                post.adoptionListing.region,
                post.adoptionListing.animalType,
                post.adoptionListing.status
                  ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;
          const volunteerSummary = post.volunteerRecruitment
            ? [
                post.volunteerRecruitment.shelterName,
                post.volunteerRecruitment.region,
                formatListDate(post.volunteerRecruitment.volunteerDate),
                post.volunteerRecruitment.status
                  ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                    post.volunteerRecruitment.status)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;
          const authorLabel = post.guestDisplayName
            ? `${post.guestDisplayName}${post.guestIpDisplay ? ` (${post.guestIpLabel ?? "아이피"} ${post.guestIpDisplay})` : ""}`
            : resolveUserDisplayName(post.author.nickname);
          const authorNode = post.guestDisplayName ? (
            <span className="block truncate">{authorLabel}</span>
          ) : (
            <Link href={`/users/${post.author.id}`} className="block truncate hover:text-[#2f5da4]">
              {authorLabel}
            </Link>
          );

          return (
            <div key={post.id}>
              {showAdSlot && adConfig && index === 4 ? (
                <article className="border-y border-[#d8e6fb] bg-[linear-gradient(180deg,#eff5ff_0%,#f8fbff_100%)] px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md border border-[#9abbe9] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#2f5da4]">
                      광고
                    </span>
                    <span className="text-[11px] text-[#55749e]">맞춤 추천</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#163764]">{adConfig.headline}</p>
                  <p className="mt-1 text-xs leading-5 text-[#446792]">{adConfig.description}</p>
                  <Link
                    href={adConfig.ctaHref}
                    className="tp-btn-primary mt-2 inline-flex items-center px-3 py-1 text-xs font-semibold"
                    onClick={() => trackPersonalizationEvent("AD_CLICK")}
                  >
                    {adConfig.ctaLabel}
                  </Link>
                </article>
              ) : null}
              <article
                data-testid="feed-post-item"
                className={`grid grid-cols-[minmax(0,1fr)_106px] gap-x-3 gap-y-0.5 px-3 py-1.5 transition hover:bg-[#f8fbff] sm:grid-cols-[minmax(0,1fr)_132px] sm:px-4 sm:py-2 md:grid-cols-[minmax(0,1fr)_188px] md:items-center ${
                  post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="mb-px flex flex-wrap items-center gap-1 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${meta.chipClass}`}
                    >
                      {meta.label}
                    </span>
                    {post.status === "HIDDEN" ? (
                      <span className="rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700">
                        숨김
                      </span>
                    ) : null}
                  </div>

                  <Link
                    href={
                      preferGuestDetail ? `/posts/${post.id}/guest` : `/posts/${post.id}`
                    }
                    prefetch={preferGuestDetail ? true : false}
                    className={`flex min-w-0 items-center gap-1 text-[14px] font-semibold leading-snug transition sm:text-base ${
                      readPostIds.has(post.id)
                        ? "text-[#8c9db8] hover:text-[#7589a8]"
                        : "text-[#1e3f74] hover:text-[#2f5da4]"
                    } visited:text-[#8c9db8]`}
                    onClick={() => {
                      markPostAsRead(post.id);
                      trackPersonalizationEvent("POST_CLICK", {
                        postId: post.id,
                      });
                    }}
                  >
                    <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {post.title}
                    </span>
                    <PostSignalIcons signals={signals} />
                    {post.commentCount > 0 ? (
                      <span className="shrink-0 text-[#2f5da4]">[{post.commentCount}]</span>
                    ) : null}
                  </Link>
                  {adoptionSummary || volunteerSummary ? (
                    <p className="mt-px hidden truncate text-[11px] text-[#6b83a6] sm:block">
                      {adoptionSummary ?? volunteerSummary}
                    </p>
                  ) : null}
                  {locationLabel || petTypeLabel ? (
                    <p className="hidden truncate text-[11px] text-[#6a82a6] sm:block">
                      {[locationLabel, petTypeLabel].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0 self-center text-right text-[10px] text-[#4f678d] sm:text-[11px]">
                  <p className="font-semibold text-[#1f3f71]">{authorNode}</p>
                  <p className="break-keep text-[#5a759c]">{statsLabel}</p>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {mode === "ALL" && !disableLoadMore ? (
        <div className="border-t border-[#d8e3f2] px-4 py-4 text-center">
          {loadError ? (
            <div className="mb-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {loadError}
            </div>
          ) : null}

          {nextCursor ? (
            <button
              type="button"
              onClick={() => {
                void loadMore();
              }}
              disabled={isLoading}
                className="tp-btn-soft inline-flex h-10 items-center justify-center px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
              {isLoading ? "불러오는 중..." : "게시글 더 보기"}
            </button>
          ) : (
            <p className="text-xs text-[#6a84ab]">마지막 게시글입니다.</p>
          )}

          <div
            ref={sentinelRef}
            data-testid="feed-load-sentinel"
            className="h-2 w-full"
            aria-hidden
          />
        </div>
      ) : null}
    </>
  );
}
