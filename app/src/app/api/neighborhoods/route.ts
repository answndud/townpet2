import { NextRequest } from "next/server";
import { z } from "zod";

import { monitorUnhandledError } from "@/server/error-monitor";
import {
  listNeighborhoodCities,
  listNeighborhoodDistricts,
  searchNeighborhoods,
} from "@/server/queries/neighborhood.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const neighborhoodQuerySchema = z.object({
  q: z.string().trim().max(40).optional(),
  city: z.string().trim().max(40).optional(),
  district: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(300).default(200),
});

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({ key: `neighborhoods:ip:${clientIp}`, limit: 60, windowMs: 60_000 });

    const { searchParams } = new URL(request.url);
    const parsed = neighborhoodQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      district: searchParams.get("district") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const [cities, districts, items] = await Promise.all([
      listNeighborhoodCities(),
      listNeighborhoodDistricts(parsed.data.city),
      searchNeighborhoods(parsed.data),
    ]);

    return jsonOk({
      cities,
      districts,
      items,
    });
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/neighborhoods", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
