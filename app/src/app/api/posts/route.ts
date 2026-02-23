import { NextRequest } from "next/server";
import { PostScope } from "@prisma/client";

import { isLoginRequiredPostType } from "@/lib/post-access";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import { postListSchema } from "@/lib/validations/post";
import { listPosts } from "@/server/queries/post.queries";
import { getCurrentUser, requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createPost } from "@/server/services/post.service";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const currentUser = await getCurrentUser();
    const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
    const rateKey = currentUser ? `feed:user:${currentUser.id}` : `feed:ip:${clientIp}`;
    await enforceRateLimit({ key: rateKey, limit: 30, windowMs: 60_000 });
    const { searchParams } = new URL(request.url);
    const parsed = postListSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: FEED_PAGE_SIZE,
      type: searchParams.get("type") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      personalized: searchParams.get("personalized") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    if (!currentUser && isLoginRequiredPostType(parsed.data.type, loginRequiredTypes)) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "선택한 카테고리는 로그인 후 이용할 수 있습니다.",
      });
    }

    const scope = parsed.data.scope ?? (currentUser ? PostScope.LOCAL : PostScope.GLOBAL);
    let neighborhoodId: string | undefined;

    if (scope === PostScope.LOCAL) {
      if (!currentUser) {
        return jsonError(401, {
          code: "AUTH_REQUIRED",
          message: "로컬 피드는 로그인 후 이용할 수 있습니다.",
        });
      }

      const userWithNeighborhoods = await getUserWithNeighborhoods(currentUser.id);
      const primaryNeighborhood = userWithNeighborhoods?.neighborhoods.find(
        (item) => item.isPrimary,
      );

      if (!primaryNeighborhood) {
        return jsonError(400, {
          code: "NEIGHBORHOOD_REQUIRED",
          message: "로컬 피드를 보려면 대표 동네를 설정해 주세요.",
        });
      }

      neighborhoodId = primaryNeighborhood.neighborhood.id;
    }

    const data = await listPosts({
      ...parsed.data,
      limit: FEED_PAGE_SIZE,
      scope,
      excludeTypes: currentUser ? undefined : loginRequiredTypes,
      neighborhoodId,
      viewerId: currentUser?.id,
      personalized: parsed.data.personalized && Boolean(currentUser?.id),
    });
    return jsonOk(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireCurrentUser();
    await enforceRateLimit({ key: `posts:${user.id}`, limit: 5, windowMs: 60_000 });

    const post = await createPost({ authorId: user.id, input: body });
    return jsonOk(post, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/posts", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
