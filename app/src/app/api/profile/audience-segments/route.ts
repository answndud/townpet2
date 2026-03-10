import type { NextRequest } from "next/server";

import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listAudienceSegmentsByUserId } from "@/server/queries/audience-segment.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireCurrentUserId();
    const segments = await listAudienceSegmentsByUserId(userId);

    return jsonOk(
      { segments },
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
      route: "GET /api/profile/audience-segments",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
