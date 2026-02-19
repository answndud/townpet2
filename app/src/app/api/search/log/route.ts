import { NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { recordSearchTerm } from "@/server/queries/search.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const searchLogSchema = z.object({
  q: z.string().min(2).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const clientIp = getClientIp(request);
    const rateKey = currentUser
      ? `search-log:user:${currentUser.id}`
      : `search-log:ip:${clientIp}`;
    await enforceRateLimit({ key: rateKey, limit: 30, windowMs: 60_000 });

    const body = await request.json().catch(() => null);
    const parsed = searchLogSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "검색어가 올바르지 않습니다.",
      });
    }

    await recordSearchTerm(parsed.data.q);

    return jsonOk({ recorded: true });
  } catch (error) {
    await monitorUnhandledError(error, { route: "POST /api/search/log", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
