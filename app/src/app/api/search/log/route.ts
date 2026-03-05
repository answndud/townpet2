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

    void recordSearchTerm(parsed.data.q).catch(async (recordError) => {
      await monitorUnhandledError(recordError, {
        route: "POST /api/search/log:record",
        request,
      });
    });

    return jsonOk({ recorded: true });
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
