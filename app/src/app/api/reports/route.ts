import { NextRequest } from "next/server";

import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createReport } from "@/server/services/report.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireCurrentUser();
    await enforceRateLimit({ key: `reports:${user.id}`, limit: 3, windowMs: 60_000 });

    const report = await createReport({ reporterId: user.id, input: body });
    return jsonOk(report, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/reports", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
