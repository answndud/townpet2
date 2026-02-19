import { NextRequest } from "next/server";

import { passwordResetConfirmSchema } from "@/lib/validations/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { confirmPasswordReset } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;
    await enforceRateLimit({
      key: `auth:password:confirm:${clientIp}`,
      limit: 5,
      windowMs: 60_000,
    });

    const body = await request.json();
    const parsed = passwordResetConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "입력값이 올바르지 않습니다.",
      });
    }

    await confirmPasswordReset({
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

    await monitorUnhandledError(error, { route: "POST /api/auth/password/reset/confirm", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
