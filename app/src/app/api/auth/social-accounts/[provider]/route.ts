import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { requireCurrentUser } from "@/server/auth";
import { ServiceError } from "@/server/services/service-error";
import { unlinkSocialAccountForUser } from "@/server/services/auth.service";

type RouteParams = {
  params: Promise<{
    provider: string;
  }>;
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCurrentUser();
    const session = await auth().catch(() => null);
    const { provider } = await params;

    const result = await unlinkSocialAccountForUser({
      userId: user.id,
      authProvider: session?.user?.authProvider ?? null,
      input: {
        provider,
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
      route: "DELETE /api/auth/social-accounts/[provider]",
      request,
    });

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
