import { NextRequest } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { jsonError, jsonOk } from "@/server/response";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
      });
    }

    const { id: targetUserId } = await params;
    if (!targetUserId) {
      return jsonError(400, {
        code: "INVALID_TARGET",
        message: "대상 사용자가 필요합니다.",
      });
    }

    const relationState = await getUserRelationState(user.id, targetUserId).catch(() => ({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    }));

    return jsonOk({ relationState });
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/users/[id]/relation", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
