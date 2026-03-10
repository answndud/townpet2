import { NextRequest } from "next/server";

import { feedPersonalizationMetricSchema } from "@/lib/validations/feed-personalization";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { recordFeedPersonalizationMetric } from "@/server/services/feed-personalization-metrics.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await requireCurrentUserId();
    const clientIp = getClientIp(request);

    await enforceRateLimit({
      key: `feed-personalization:user:${currentUserId}:ip:${clientIp}`,
      limit: 120,
      windowMs: 60_000,
      cacheMs: 500,
    });

    const body = await request.json().catch(() => null);
    const parsed = feedPersonalizationMetricSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "개인화 지표 payload가 올바르지 않습니다.",
      });
    }

    const result = await recordFeedPersonalizationMetric({
      ...parsed.data,
      userId: currentUserId,
    });
    if (!result.ok) {
      return jsonOk(
        {
          recorded: false,
          skippedReason: result.reason,
        },
        { status: 202 },
      );
    }

    return jsonOk({
      recorded: true,
      skippedReason: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "POST /api/feed/personalization",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
