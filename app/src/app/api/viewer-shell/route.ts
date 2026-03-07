import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import { getUserById } from "@/server/queries/user.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

function extractPreferredPetTypeIds(user: unknown) {
  if (!user || typeof user !== "object") {
    return [];
  }

  const preferredPetTypes = (user as { preferredPetTypes?: unknown }).preferredPetTypes;
  if (!Array.isArray(preferredPetTypes)) {
    return [];
  }

  return preferredPetTypes
    .map((item) =>
      item && typeof item === "object"
        ? (item as { petTypeId?: string | null }).petTypeId
        : null,
    )
    .filter((petTypeId): petTypeId is string => typeof petTypeId === "string");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (!userId) {
      return jsonOk(
        {
          isAuthenticated: false,
          canModerate: false,
          unreadNotificationCount: 0,
          preferredPetTypeIds: [] as string[],
        },
        {
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }

    const [currentUser, unreadNotificationCount] = await Promise.all([
      getUserById(userId).catch(() => null),
      countUnreadNotifications(userId),
    ]);
    const canModerate =
      currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;

    return jsonOk(
      {
        isAuthenticated: true,
        canModerate,
        unreadNotificationCount,
        preferredPetTypeIds: extractPreferredPetTypeIds(currentUser),
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "GET /api/viewer-shell",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
