import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { recordSearchTerm } from "@/server/queries/search.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const searchLogSchema = z.object({
  q: z.string().min(2).max(100),
});

export async function POST(request: NextRequest) {
  try {
    let currentUserId: string | null = null;
    try {
      currentUserId = await getCurrentUserId();
    } catch {
      currentUserId = null;
    }

    const clientIp = getClientIp(request);
    const rateKey = currentUserId
      ? `search-log:user:${currentUserId}`
      : `search-log:ip:${clientIp}`;
    await enforceRateLimit({
      key: rateKey,
      limit: 30,
      windowMs: 60_000,
      cacheMs: 500,
    });

    const body = await request.json().catch(() => null);
    const parsed = searchLogSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "검색어가 올바르지 않습니다.",
      });
    }

    const result = await recordSearchTerm(parsed.data.q);
    if (!result.ok) {
      throw new ServiceError(
        "검색 통계 저장소 동기화가 필요합니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
        "SCHEMA_SYNC_REQUIRED",
        503,
      );
    }

    return jsonOk({
      recorded: result.recorded,
      skippedReason: result.recorded ? null : result.reason,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/search/log", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
