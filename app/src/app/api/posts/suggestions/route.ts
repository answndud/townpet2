import { NextRequest } from "next/server";
import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

import { isLoginRequiredPostType } from "@/lib/post-access";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPostSearchSuggestions } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const searchSuggestionSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(8),
  type: z.nativeEnum(PostType).optional(),
  scope: z.nativeEnum(PostScope).optional(),
  searchIn: z.enum(["ALL", "TITLE", "CONTENT", "AUTHOR"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchSuggestionSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const clientIp = getClientIp(request);
    const currentUserId = hasSessionCookieFromRequest(request)
      ? await getCurrentUserId()
      : null;
    const viewerId = currentUserId ?? undefined;
    const loginRequiredTypesPromise = currentUserId
      ? Promise.resolve([])
      : getGuestReadLoginRequiredPostTypes();
    const rateKey = currentUserId
      ? `feed-suggest:user:${currentUserId}`
      : `feed-suggest:ip:${clientIp}`;
    await enforceRateLimit({
      key: rateKey,
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    });
    const loginRequiredTypes = await loginRequiredTypesPromise;
    if (!currentUserId && isLoginRequiredPostType(parsed.data.type, loginRequiredTypes)) {
      return jsonOk({ items: [] as string[] });
    }

    const scope = parsed.data.scope ?? PostScope.GLOBAL;
    let neighborhoodId: string | undefined;

    if (scope === PostScope.LOCAL) {
      if (!currentUserId) {
        return jsonOk({ items: [] as string[] });
      }

      const userWithNeighborhoods = await getUserWithNeighborhoods(currentUserId);
      const primaryNeighborhood = userWithNeighborhoods?.neighborhoods.find(
        (item) => item.isPrimary,
      );

      if (!primaryNeighborhood) {
        return jsonOk({ items: [] as string[] });
      }

      neighborhoodId = primaryNeighborhood.neighborhood.id;
    }

    const items = await listPostSearchSuggestions({
      q: parsed.data.q,
      limit: parsed.data.limit,
      type: parsed.data.type,
      scope,
      searchIn: parsed.data.searchIn,
      excludeTypes: currentUserId ? undefined : loginRequiredTypes,
      neighborhoodId,
      viewerId,
    });
    const canCache = !currentUserId && scope === PostScope.GLOBAL;
    return jsonOk(
      { items },
      {
        headers: {
          "cache-control": canCache ? buildCacheControlHeader(60, 600) : "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts/suggestions", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
