import { NextRequest } from "next/server";

import { registerSchema } from "@/lib/validations/auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { registerUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() ?? "anonymous";
    enforceRateLimit({
      key: `auth:register:${clientIp}`,
      limit: 5,
      windowMs: 60_000,
    });

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "회원가입 입력값이 올바르지 않습니다.",
      });
    }

    const user = await registerUser({ input: parsed.data });
    return jsonOk(user, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
