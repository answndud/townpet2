import { NextRequest } from "next/server";

import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPublicUserProfileById } from "@/server/queries/user.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  let viewerId: string | undefined;

  try {
    viewerId = await requireCurrentUserId();
    const { id } = await params;
    const profile = await getPublicUserProfileById(id);

    if (!profile) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return jsonOk(
      {
        id: profile.id,
        showPublicPosts: profile.showPublicPosts,
        showPublicComments: profile.showPublicComments,
        postCount: profile.postCount,
        commentCount: profile.commentCount,
        reactionCount: profile.reactionCount,
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

    await monitorUnhandledError(error, {
      route: "GET /api/users/[id]/profile-summary",
      request,
      userId: viewerId,
    });

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
