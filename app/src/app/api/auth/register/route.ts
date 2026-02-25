import { NextRequest } from "next/server";

import { registerSchema } from "@/lib/validations/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { sendVerificationEmail } from "@/server/email";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { registerUser, requestEmailVerification } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

function toPublicRegisterError(error: ServiceError) {
  if (error.code === "EMAIL_TAKEN" || error.code === "NICKNAME_TAKEN") {
    return {
      status: 400,
      code: "REGISTER_REJECTED",
      message: "회원가입 정보를 확인해 주세요.",
    } as const;
  }

  return {
    status: error.status,
    code: error.code,
    message: error.message,
  } as const;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
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
    const verification = await requestEmailVerification({
      input: { email: user.email },
    });

    if (verification.token) {
      await sendVerificationEmail({ email: user.email, token: verification.token });
    }

    return jsonOk(user, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      const publicError = toPublicRegisterError(error);
      return jsonError(publicError.status, {
        code: publicError.code,
        message: publicError.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/auth/register", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
