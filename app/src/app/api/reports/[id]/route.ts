import { NextRequest } from "next/server";

import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { updateReport } from "@/server/services/report.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const user = await requireModerator();

    const report = await updateReport({
      reportId: id,
      input: body,
      moderatorId: user.id,
    });
    return jsonOk(report);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "PATCH /api/reports/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
