import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { invalidateUserSessions } from "@/server/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (userId) {
      await invalidateUserSessions({ userId });
    }

    return jsonOk(
      { revoked: Boolean(userId) },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "POST /api/auth/logout",
      request,
    });

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
