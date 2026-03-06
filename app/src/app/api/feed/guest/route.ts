import { NextRequest } from "next/server";
import { PostScope, PostType, Prisma } from "@prisma/client";
import { z } from "zod";

import { FEED_PAGE_SIZE } from "@/lib/feed";
import { isCommonBoardPostType } from "@/lib/community-board";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { REVIEW_CATEGORY, REVIEW_CATEGORY_VALUES } from "@/lib/review-category";
import { isLocalRequiredPostType } from "@/lib/post-scope-policy";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import {
  countBestPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedDensity = "DEFAULT" | "ULTRA";

const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;

const guestFeedQuerySchema = z.object({
  type: z.nativeEnum(PostType).optional(),
  q: z.string().trim().max(100).optional(),
  mode: z.enum(["ALL", "BEST"]).optional(),
  days: z.coerce.number().int().optional(),
  period: z.coerce.number().int().optional(),
  sort: z.enum(["LATEST", "LIKE", "COMMENT"]).optional(),
  searchIn: z.enum(["ALL", "TITLE", "CONTENT", "AUTHOR"]).optional(),
  review: z.enum(REVIEW_CATEGORY_VALUES).optional(),
  personalized: z.enum(["0", "1"]).optional(),
  page: z.coerce.number().int().positive().optional(),
});

function toFeedMode(value?: string): FeedMode {
  return value === "BEST" ? "BEST" : "ALL";
}

function toBestDay(value?: string) {
  const numeric = Number(value);
  return BEST_DAY_OPTIONS.includes(numeric as (typeof BEST_DAY_OPTIONS)[number])
    ? (numeric as (typeof BEST_DAY_OPTIONS)[number])
    : 7;
}

function toFeedPeriod(value?: string) {
  const numeric = Number(value);
  return FEED_PERIOD_OPTIONS.includes(numeric as (typeof FEED_PERIOD_OPTIONS)[number])
    ? (numeric as (typeof FEED_PERIOD_OPTIONS)[number])
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

function toFeedDensity(value?: string): FeedDensity {
  return value === "ULTRA" ? "ULTRA" : "DEFAULT";
}

function isDatabaseUnavailableError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}

function serializeFeedItems(items: Array<Record<string, unknown>>) {
  return items.map((post) => ({
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
    createdAt:
      post.createdAt instanceof Date
        ? post.createdAt.toISOString()
        : String(post.createdAt),
    author: {
      id: (post.author as { id: string }).id,
      name: ((post.author as { name?: string | null }).name ?? null) as string | null,
      nickname: ((post.author as { nickname?: string | null }).nickname ?? null) as string | null,
      image: ((post.author as { image?: string | null }).image ?? null) as string | null,
    },
    guestDisplayName:
      (post as { guestDisplayName?: string | null }).guestDisplayName ??
      (post as { guestAuthor?: { displayName?: string | null } | null }).guestAuthor?.displayName ??
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
          id: (post.neighborhood as { id: string }).id,
          name: (post.neighborhood as { name: string }).name,
          city: (post.neighborhood as { city: string }).city,
          district: (post.neighborhood as { district: string }).district,
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
    images: ((post.images as Array<{ id: string }>) ?? []).map((image) => ({
      id: image.id,
    })),
    reactions:
      ((post.reactions as Array<{ type: "LIKE" | "DISLIKE" }> | undefined) ?? []).map(
        (reaction) => ({ type: reaction.type }),
      ),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `feed-guest:ip:${clientIp}`,
      limit: 30,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const { searchParams } = new URL(request.url);
    const petTypeQueryValues = searchParams
      .getAll("petType")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const parsedPetTypes = z.array(z.string().cuid()).max(50).safeParse(petTypeQueryValues);
    if (!parsedPetTypes.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const parsed = guestFeedQuerySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
      days: searchParams.get("days") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
      review: searchParams.get("review") ?? undefined,
      personalized: searchParams.get("personalized") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const [communities, loginRequiredTypes] = await Promise.all([
      listCommunityNavItems(50).catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
      getGuestReadLoginRequiredPostTypes().catch((error) => {
        if (isDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
    ]);

    const allPetTypeIds = communities.map((item) => item.id);
    const parsedParams = postListSchema.safeParse({
      ...parsed.data,
      petType: parsedPetTypes.data[0],
      limit: FEED_PAGE_SIZE,
    });
    const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
    const requestedType = listInput?.type;
    const requestedReviewCategory = listInput?.reviewCategory;
    const isLegacyReviewType =
      requestedType === PostType.PLACE_REVIEW || requestedType === PostType.PRODUCT_REVIEW;
    const type = isLegacyReviewType ? null : requestedType ?? null;
    const reviewCategory =
      requestedReviewCategory ??
      (requestedType === PostType.PLACE_REVIEW ? REVIEW_CATEGORY.PLACE : undefined);
    const reviewBoard = isLegacyReviewType || Boolean(reviewCategory);
    const requestedPetTypeId = listInput?.petTypeId;
    const requestedPetTypeIds =
      parsedPetTypes.data.length > 0
        ? Array.from(new Set(parsedPetTypes.data)).filter((id) => allPetTypeIds.includes(id))
        : requestedPetTypeId
          ? [requestedPetTypeId].filter((id) => allPetTypeIds.includes(id))
          : [];
    const isCommonBoardType = type ? isCommonBoardPostType(type) : false;
    const isFreeBoardType = type ? isFreeBoardPostType(type) : false;
    const petTypeIds =
      isCommonBoardType || isFreeBoardType
        ? []
        : requestedPetTypeIds.length > 0
          ? requestedPetTypeIds
          : allPetTypeIds;
    const petTypeId = petTypeIds[0] ?? null;
    const effectiveScope = PostScope.GLOBAL;
    const mode = toFeedMode(parsed.data.mode);
    const bestDays = toBestDay(parsed.data.days ? String(parsed.data.days) : undefined);
    const periodDays = toFeedPeriod(parsed.data.period ? String(parsed.data.period) : undefined);
    const selectedSort = toFeedSort(parsed.data.sort);
    const selectedSearchIn = toFeedSearchIn(parsed.data.searchIn);
    const density = toFeedDensity(searchParams.get("density") ?? undefined);
    const isGuestTypeBlocked = isLoginRequiredPostType(requestedType, loginRequiredTypes);
    const isLocalRequiredType = isLocalRequiredPostType(type ?? undefined);
    const query = listInput?.q?.trim() ?? "";
    const requestedPage = parsed.data.page ?? 1;
    const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    if (isLocalRequiredType && type) {
      return jsonOk(
        {
          view: "gate" as const,
          gate: {
            title: "로그인 후 이용할 수 있습니다.",
            description: `${type} 게시판은 내 동네 기반으로 노출됩니다. 로그인 후 대표 동네를 설정해 주세요.`,
            primaryLink: `/login?next=${encodeURIComponent(`/feed?type=${type}`)}`,
            primaryLabel: "로그인하기",
            secondaryLink: "/feed",
            secondaryLabel: "전체 피드 보기",
          },
        },
        {
          headers: {
            "cache-control": buildCacheControlHeader(30, 300),
          },
        },
      );
    }

    const totalItemCount =
      mode === "BEST" && !isGuestTypeBlocked
        ? await countBestPosts({
            days: bestDays,
            type: type ?? undefined,
            reviewBoard,
            reviewCategory,
            scope: effectiveScope,
            petTypeId: petTypeId ?? undefined,
            petTypeIds,
            q: query || undefined,
            searchIn: selectedSearchIn,
            excludeTypes: loginRequiredTypes,
            neighborhoodId: undefined,
            minLikes: 1,
            viewerId: undefined,
          }).catch((error) => {
            if (isDatabaseUnavailableError(error)) {
              return 0;
            }
            throw error;
          })
        : 0;

    const totalPages = mode === "BEST" ? Math.max(1, Math.ceil(totalItemCount / FEED_PAGE_SIZE)) : 1;
    const resolvedPage = mode === "BEST" ? Math.min(currentPage, totalPages) : 1;

    const posts =
      mode === "ALL" && !isGuestTypeBlocked
        ? await listPosts({
            limit: FEED_PAGE_SIZE,
            type: type ?? undefined,
            reviewBoard,
            reviewCategory,
            scope: effectiveScope,
            petTypeId: petTypeId ?? undefined,
            petTypeIds,
            q: query || undefined,
            searchIn: selectedSearchIn,
            days: periodDays ?? undefined,
            sort: selectedSort,
            excludeTypes: loginRequiredTypes,
            neighborhoodId: undefined,
            viewerId: undefined,
            personalized: false,
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
            limit: FEED_PAGE_SIZE,
            page: resolvedPage,
            days: bestDays,
            type: type ?? undefined,
            reviewBoard,
            reviewCategory,
            scope: effectiveScope,
            petTypeId: petTypeId ?? undefined,
            petTypeIds,
            q: query || undefined,
            searchIn: selectedSearchIn,
            excludeTypes: loginRequiredTypes,
            neighborhoodId: undefined,
            minLikes: 1,
            viewerId: undefined,
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
        ? `${type} 게시판`
        : "전체 게시판";
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
      density,
      bestDays,
      periodDays ?? "ALL_TIME",
      query || "__EMPTY__",
      mode === "BEST" ? resolvedPage : "CURSOR",
    ].join("|");

    return jsonOk(
      {
        view: "feed" as const,
        feed: {
          mode,
          type,
          reviewBoard,
          reviewCategory: reviewCategory ?? null,
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
          items: serializeFeedItems(items as Array<Record<string, unknown>>),
          nextCursor: mode === "ALL" ? posts.nextCursor : null,
        },
      },
      {
        headers: {
          "cache-control": buildCacheControlHeader(30, 300),
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/feed/guest", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
