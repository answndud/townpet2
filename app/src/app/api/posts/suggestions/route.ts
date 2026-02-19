import { NextRequest } from "next/server";
import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

import { isLoginRequiredPostType } from "@/lib/post-access";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPostSearchSuggestions } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

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
    const currentUser = await getCurrentUser();
    const rateKey = currentUser
      ? `feed-suggest:user:${currentUser.id}`
      : `feed-suggest:ip:${clientIp}`;
    await enforceRateLimit({ key: rateKey, limit: 60, windowMs: 60_000 });

    const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
    if (!currentUser && isLoginRequiredPostType(parsed.data.type, loginRequiredTypes)) {
      return jsonOk({ items: [] as string[] });
    }

    const scope = parsed.data.scope ?? (currentUser ? PostScope.LOCAL : PostScope.GLOBAL);
    let neighborhoodId: string | undefined;

    if (scope === PostScope.LOCAL) {
      if (!currentUser) {
        return jsonOk({ items: [] as string[] });
      }

      const userWithNeighborhoods = await getUserWithNeighborhoods(currentUser.id);
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
      excludeTypes: currentUser ? undefined : loginRequiredTypes,
      neighborhoodId,
    });

    return jsonOk({ items });
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/posts/suggestions", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
