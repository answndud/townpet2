import type { NextRequest } from "next/server";

import { isSocialDevLoginEnabled } from "@/lib/env";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { requireCurrentUser } from "@/server/auth";
import { linkSocialAccountForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    if (!isSocialDevLoginEnabled()) {
      return jsonError(404, {
        code: "FEATURE_DISABLED",
        message: "개발용 소셜 계정 연결이 비활성화되어 있습니다.",
      });
    }

    const user = await requireCurrentUser();
    const body = await request.json();
    const provider =
      typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "";

    const result = await linkSocialAccountForUser({
      userId: user.id,
      input: {
        provider,
        providerAccountId: `social-dev:${provider}:${user.id}`,
      },
    });

    return jsonOk(result, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "POST /api/auth/social-dev/link",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
