import { NextRequest } from "next/server";

import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { canGuestReadPost } from "@/lib/post-access";
import { getCurrentUser } from "@/server/auth";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { jsonError, jsonOk } from "@/server/response";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getCurrentUser();
    const post = await getPostById(postId, user?.id);
    if (!post) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    if (!user) {
      const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
      if (!canGuestReadPost({
        scope: post.scope,
        type: post.type,
        loginRequiredTypes,
      })) {
        return jsonError(401, {
          code: "AUTH_REQUIRED",
          message: "로그인이 필요한 게시글입니다.",
        });
      }
    }

    if (user && post.scope === "LOCAL") {
      const userWithNeighborhoods = await getUserWithNeighborhoods(user.id);
      const primaryNeighborhood = userWithNeighborhoods?.neighborhoods.find((item) => item.isPrimary);
      if (!primaryNeighborhood) {
        return jsonError(400, {
          code: "NEIGHBORHOOD_REQUIRED",
          message: "동네 설정이 필요합니다.",
        });
      }
    }

    const renderedContentHtml = renderLiteMarkdown(post.content);
    const renderedContentText = renderedContentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return jsonOk(
      {
        post: {
          ...post,
          renderedContentHtml,
          renderedContentText,
        },
        viewerId: user?.id ?? null,
      },
      {
        headers: {
          "cache-control": user ? "no-store" : buildCacheControlHeader(30, 300),
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/detail", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
