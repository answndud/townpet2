import { NextRequest } from "next/server";

import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { bulkUpdateReports } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireModerator();

    const result = await bulkUpdateReports({
      input: body,
      moderatorId: user.id,
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "PATCH /api/reports/bulk", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
