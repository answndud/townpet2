import { NextRequest } from "next/server";

import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { restoreDirectUserContent } from "@/server/services/direct-moderation.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireModerator();

    const result = await restoreDirectUserContent({
      moderatorId: user.id,
      input: body,
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "POST /api/admin/moderation/users/restore-content",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
