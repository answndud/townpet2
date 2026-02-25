import { NextRequest } from "next/server";
import { z } from "zod";

import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommunities } from "@/server/queries/community.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const communityListQuerySchema = z.object({
  category: z.string().trim().min(1).max(50).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({ key: `communities:ip:${clientIp}`, limit: 60, windowMs: 60_000 });

    const { searchParams } = new URL(request.url);
    const parsed = communityListQuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const data = await listCommunities(parsed.data);
    return jsonOk(data);
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/communities", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
