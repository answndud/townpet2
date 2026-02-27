import { NextRequest } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { registerPostView } from "@/server/services/post.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getCurrentUser();
    await registerPostView({
      postId,
      userId: user?.id,
      clientIp: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    await monitorUnhandledError(error, { route: "POST /api/posts/[id]/view", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
