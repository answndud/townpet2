"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
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
    const user = await requireCurrentUser();
    userId = user.id;

    const changed = await markNotificationRead(user.id, notificationId);
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
    const user = await requireCurrentUser();
    userId = user.id;

    const updated = await markAllNotificationsRead(user.id);
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
