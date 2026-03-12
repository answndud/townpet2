import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { getCurrentUserIdFromRequest, getCurrentUserRole } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostById } from "@/server/queries/post.queries";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
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
    const viewerRole = userId ? (await getCurrentUserRole())?.role ?? null : null;
    const canModerate =
      viewerRole === UserRole.ADMIN || viewerRole === UserRole.MODERATOR;
    const post = await getPostById(postId, viewerId);
    if (!post) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId, {
      viewerRole,
      allowModeratorHiddenRead: true,
    });

    const renderedContentHtml = renderLiteMarkdown(post.content);
    const renderedContentText = renderedContentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const relationState =
      userId && userId !== post.authorId
        ? await getUserRelationState(userId, post.authorId)
        : {
            isBlockedByMe: false,
            hasBlockedMe: false,
            isMutedByMe: false,
          };

    return jsonOk(
      {
        post: {
          ...post,
          renderedContentHtml,
          renderedContentText,
        },
        viewerId: userId,
        canModerate,
        relationState,
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

    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/detail", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
