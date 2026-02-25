import { CommonBoardType } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommonBoardPosts } from "@/server/queries/community.queries";
import { jsonError, jsonOk } from "@/server/response";

const commonBoardRouteParamSchema = z.enum(["hospital", "lost-found", "market"]);

const commonBoardQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  animalTag: z.string().trim().min(1).max(24).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

const commonBoardTypeByRoute: Record<
  z.infer<typeof commonBoardRouteParamSchema>,
  CommonBoardType
> = {
  hospital: CommonBoardType.HOSPITAL,
  "lost-found": CommonBoardType.LOST_FOUND,
  market: CommonBoardType.MARKET,
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ board: string }> },
) {
  try {
    const params = await context.params;
    const boardParsed = commonBoardRouteParamSchema.safeParse(params.board);
    if (!boardParsed.success) {
      return jsonError(400, {
        code: "INVALID_BOARD",
        message: "지원하지 않는 공용 보드입니다.",
      });
    }

    const { searchParams } = new URL(request.url);
    const queryParsed = commonBoardQuerySchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      animalTag: searchParams.get("animalTag") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!queryParsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const data = await listCommonBoardPosts({
      ...queryParsed.data,
      commonBoardType: commonBoardTypeByRoute[boardParsed.data],
    });
    return jsonOk(data);
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "GET /api/boards/[board]/posts",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
