import { NextRequest } from "next/server";

import { passwordSetupSchema } from "@/lib/validations/auth";
import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { setPasswordForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await enforceRateLimit({
      key: `auth:password:setup:${user.id}`,
      limit: 5,
      windowMs: 60_000,
    });

    const body = await request.json();
    const parsed = passwordSetupSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "비밀번호 입력값이 올바르지 않습니다.",
      });
    }

    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    await setPasswordForUser({
      userId: user.id,
      input: parsed.data,
      meta: { ipAddress: clientIp, userAgent },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/auth/password/setup", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
