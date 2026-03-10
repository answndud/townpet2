"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostType } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { FeedPostMetaBadges } from "@/components/posts/feed-post-meta-badges";
import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import type {
  FeedAudienceSourceValue,
  FeedPersonalizationEventValue,
  FeedPersonalizationSurfaceValue,
} from "@/lib/feed-personalization-metrics";
import {
  sendFeedPersonalizationMetric,
} from "@/lib/feed-personalization-tracking";
import { formatKoreanMonthDay } from "@/lib/date-format";
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

let relativeNowSnapshot: number | null = null;
let relativeNowPrimed = false;
let relativeNowInterval: number | null = null;
const relativeNowListeners = new Set<() => void>();

function emitRelativeNow(next: number) {
  relativeNowSnapshot = next;
}

function refreshRelativeNow() {
  emitRelativeNow(Date.now());
  for (const listener of relativeNowListeners) {
    listener();
  }
}

function subscribeRelativeNow(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  relativeNowListeners.add(onStoreChange);

  if (!relativeNowPrimed) {
    relativeNowPrimed = true;
    queueMicrotask(refreshRelativeNow);
  }

  if (relativeNowInterval === null) {
    relativeNowInterval = window.setInterval(refreshRelativeNow, 60_000);
  }

  const handlePageShow = () => {
    refreshRelativeNow();
  };

  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("focus", refreshRelativeNow);

  return () => {
    relativeNowListeners.delete(onStoreChange);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("focus", refreshRelativeNow);
    if (relativeNowListeners.size === 0 && relativeNowInterval !== null) {
      window.clearInterval(relativeNowInterval);
      relativeNowInterval = null;
    }
  };
}

function formatListDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatKoreanMonthDay(date);
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
  mode,
  query,
  queryKey,
  preferGuestDetail,
  adConfig,
  personalizationTracking,
}: FeedInfiniteListProps) {
  const items = initialItems;
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() => new Set());
  const restoreDoneRef = useRef(false);
  const scrollStorageKey = useMemo(() => `feed:scroll:${queryKey}`, [queryKey]);
  const relativeNow = useSyncExternalStore(
    subscribeRelativeNow,
    () => relativeNowSnapshot,
    () => null,
  );
  const showAdSlot = Boolean(adConfig && mode === "ALL" && initialItems.length >= 5);
  const trackedViewKeyRef = useRef<string | null>(null);
  const trackedAdKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const isPersonalizedQuery = Boolean(query.personalized);

  useEffect(() => {
    refreshRelativeNow();
  }, [queryKey]);

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
      if (!isPersonalizedQuery || !personalizationTracking) {
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
    [isPersonalizedQuery, personalizationTracking],
  );

  useEffect(() => {
    if (!isPersonalizedQuery || !personalizationTracking || items.length === 0) {
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
    isPersonalizedQuery,
    items.length,
    personalizationTracking,
    queryKey,
    trackPersonalizationEvent,
  ]);

  useEffect(() => {
    if (
      !showAdSlot ||
      !adConfig ||
      !isPersonalizedQuery ||
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
    isPersonalizedQuery,
    personalizationTracking,
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
                className={`grid grid-cols-1 gap-x-3 gap-y-1.5 px-3 py-2 transition hover:bg-[#f8fbff] sm:grid-cols-[minmax(0,1fr)_140px] sm:gap-y-0.5 sm:px-4 sm:py-2 md:grid-cols-[minmax(0,1fr)_196px] md:items-center ${
                  post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                }`}
              >
                <div className="min-w-0">
                  <Link
                    href={
                      preferGuestDetail ? `/posts/${post.id}/guest` : `/posts/${post.id}`
                    }
                    prefetch={preferGuestDetail ? true : false}
                    className={`tp-text-card-title flex min-w-0 items-center gap-1 transition ${
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
                    <span className="overflow-hidden leading-[1.32] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
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

                <div className="min-w-0 flex items-start justify-between gap-3 border-t border-[#edf2fa] pt-1.5 text-[10px] text-[#4f678d] sm:self-center sm:block sm:border-t-0 sm:pt-0 sm:text-right sm:text-[11px]">
                  <FeedPostMetaBadges
                    label={meta.label}
                    chipClass={meta.chipClass}
                    status={post.status}
                    className="justify-start sm:mb-1 sm:justify-end"
                  />
                  <div className="min-w-0 text-right">
                    <p className="font-semibold text-[#1f3f71]">{authorNode}</p>
                    <p className="mt-0.5 break-keep text-[#5a759c]">{statsLabel}</p>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </>
  );
}
