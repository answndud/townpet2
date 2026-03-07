import { NextRequest } from "next/server";
import { z } from "zod";

import { guestStepUpScopeValues, issueGuestStepUpChallenge } from "@/server/guest-step-up";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const guestStepUpSchema = z.object({
  scope: z.enum(guestStepUpScopeValues),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = guestStepUpSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "잘못된 요청입니다.",
      });
    }

    const clientIp = getClientIp(request);
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    await enforceRateLimit({
      key: `guest-step-up:${parsed.data.scope}:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`,
      limit: 20,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const challenge = issueGuestStepUpChallenge({
      scope: parsed.data.scope,
      ip: clientIp,
      fingerprint: guestFingerprint,
      userAgent: request.headers.get("user-agent"),
      forwardedFor: request.headers.get("x-forwarded-for"),
      acceptLanguage: request.headers.get("accept-language"),
    });

    return jsonOk(challenge);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/guest/step-up", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "비회원 추가 확인 준비 중 오류가 발생했습니다.",
    });
  }
}
