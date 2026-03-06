import { NextRequest } from "next/server";
import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

import { isLoginRequiredPostType } from "@/lib/post-access";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listRankedSearchPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const guestSearchSchema = z.object({
  q: z.string().trim().min(0).max(100).default(""),
  type: z.nativeEnum(PostType).optional(),
  searchIn: z.enum(["ALL", "TITLE", "CONTENT", "AUTHOR"]).default("ALL"),
  limit: z.coerce.number().int().min(1).max(30).default(30),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = guestSearchSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `guest-search:ip:${clientIp}`,
      limit: 40,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const { q, type, searchIn, limit } = parsed.data;
    const [loginRequiredTypes, popularTerms] = await Promise.all([
      getGuestReadLoginRequiredPostTypes(),
      getPopularSearchTerms(10),
    ]);
    const isGuestTypeBlocked = isLoginRequiredPostType(type, loginRequiredTypes);
    const query = q.trim();
    const items =
      query.length > 0 && !isGuestTypeBlocked
        ? await listRankedSearchPosts({
            limit,
            scope: PostScope.GLOBAL,
            type,
            q: query,
            searchIn,
            excludeTypes: loginRequiredTypes,
            neighborhoodId: undefined,
            viewerId: undefined,
          })
        : [];

    return jsonOk(
      {
        query,
        type: type ?? null,
        searchIn,
        isGuestTypeBlocked,
        popularTerms,
        items,
      },
      {
        headers: {
          "cache-control": buildCacheControlHeader(45, 300),
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/search/guest", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
