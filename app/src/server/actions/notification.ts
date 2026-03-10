"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  archiveNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/queries/notification.queries";
import { ServiceError } from "@/server/services/service-error";

type NotificationActionResult =
  | { ok: true; updated: number }
  | { ok: false; code: string; message: string };

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  let userId: string | undefined;

  try {
    userId = await requireCurrentUserId();

    const changed = await markNotificationRead(userId, notificationId);
    if (changed) {
      revalidatePath("/notifications");
      revalidatePath("/", "layout");
    }

    return { ok: true, updated: changed ? 1 : 0 };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:markNotificationReadAction",
      userId,
      extra: { notificationId },
    });
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  let userId: string | undefined;

  try {
    userId = await requireCurrentUserId();

    const updated = await markAllNotificationsRead(userId);
    if (updated > 0) {
      revalidatePath("/notifications");
      revalidatePath("/", "layout");
    }

    return { ok: true, updated };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:markAllNotificationsReadAction",
      userId,
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function archiveNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  let userId: string | undefined;

  try {
    userId = await requireCurrentUserId();

    const changed = await archiveNotification(userId, notificationId);
    if (changed) {
      revalidatePath("/notifications");
      revalidatePath("/", "layout");
    }

    return { ok: true, updated: changed ? 1 : 0 };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:archiveNotificationAction",
      userId,
      extra: { notificationId },
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
