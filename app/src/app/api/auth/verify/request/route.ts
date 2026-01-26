import { NextRequest } from "next/server";

import { emailVerificationRequestSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/server/email";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { requestEmailVerification } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() ?? "anonymous";
    enforceRateLimit({ key: `auth:verify:${clientIp}`, limit: 5, windowMs: 60_000 });

    const body = await request.json();
    const parsed = emailVerificationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "입력값이 올바르지 않습니다.",
      });
    }

    const result = await requestEmailVerification({ input: parsed.data });
    if (result.token) {
      await sendVerificationEmail({ email: parsed.data.email, token: result.token });
    }

    const shouldReturnToken = process.env.NODE_ENV !== "production";
    return jsonOk({ token: shouldReturnToken ? result.token : null });
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
