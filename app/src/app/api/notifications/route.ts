import { NextRequest } from "next/server";
import { z } from "zod";

import {
  notificationFilterKindValues,
  parseUnreadOnly,
} from "@/lib/notification-filter";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listNotificationsByUser } from "@/server/queries/notification.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const notificationListSchema = z.object({
  cursor: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  kind: z.enum(notificationFilterKindValues).default("ALL"),
});

export async function GET(request: NextRequest) {
  let userId: string | undefined;

  try {
    const authenticatedUserId = await requireCurrentUserId();
    userId = authenticatedUserId;
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `notifications:${authenticatedUserId}:${clientIp}`,
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const { searchParams } = new URL(request.url);
    const parsed = notificationListSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      kind: searchParams.get("kind") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const unreadOnly = parseUnreadOnly(searchParams.get("unreadOnly"));

    const { items, nextCursor, page, totalPages, totalCount } = await listNotificationsByUser({
      userId: authenticatedUserId,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
      page: parsed.data.page,
      kind: parsed.data.kind,
      unreadOnly,
    });

    return jsonOk({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        isRead: item.isRead,
        createdAt: item.createdAt.toISOString(),
        postId: item.postId,
        commentId: item.commentId,
        actor: item.actor
          ? {
              id: item.actor.id,
              nickname: item.actor.nickname,
              image: item.actor.image,
            }
          : null,
      })),
      nextCursor,
      page,
      totalPages,
      totalCount,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "GET /api/notifications",
      request,
      userId,
    });

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
