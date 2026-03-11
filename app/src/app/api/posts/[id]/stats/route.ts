import { NextRequest } from "next/server";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostStatsById } from "@/server/queries/post.queries";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const userId = await getCurrentUserIdFromRequest(request);
    const viewerId = userId ?? undefined;
    const post = await getPostStatsById(postId, viewerId);
    if (!post) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId);

    return jsonOk(
      {
        likeCount: post.likeCount ?? 0,
        dislikeCount: post.dislikeCount ?? 0,
        commentCount: post.commentCount ?? 0,
        viewCount: post.viewCount ?? 0,
      },
      {
        headers: {
          "cache-control": "no-store",
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

    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/stats", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
