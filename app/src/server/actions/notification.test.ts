import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import {
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification";
import { requireAuthenticatedUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  archiveNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/queries/notification.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/queries/notification.queries", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  archiveNotification: vi.fn(),
}));

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRequireAuthenticatedUserId = vi.mocked(requireAuthenticatedUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockMarkNotificationRead = vi.mocked(markNotificationRead);
const mockMarkAllNotificationsRead = vi.mocked(markAllNotificationsRead);
const mockArchiveNotification = vi.mocked(archiveNotification);

describe("notification actions", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockRequireAuthenticatedUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockMarkNotificationRead.mockReset();
    mockMarkAllNotificationsRead.mockReset();
    mockArchiveNotification.mockReset();
  });

  it("marks one notification as read and revalidates when changed", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockMarkNotificationRead.mockResolvedValue(true);

    const result = await markNotificationReadAction("noti-1");

    expect(result).toEqual({ ok: true, updated: 1 });
    expect(mockMarkNotificationRead).toHaveBeenCalledWith("user-1", "noti-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/notifications");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not revalidate when mark-read changed nothing", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockMarkNotificationRead.mockResolvedValue(false);

    const result = await markNotificationReadAction("noti-1");

    expect(result).toEqual({ ok: true, updated: 0 });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("maps mark-read service errors", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockMarkNotificationRead.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );

    const result = await markNotificationReadAction("noti-1");

    expect(result).toEqual({ ok: false, code: "FORBIDDEN", message: "forbidden" });
  });

  it("returns 500 and monitors unexpected mark-read errors", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockMarkNotificationRead.mockRejectedValue(new Error("boom"));

    const result = await markNotificationReadAction("noti-1");

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });

  it("marks all notifications as read and revalidates when updated", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-2");
    mockMarkAllNotificationsRead.mockResolvedValue(3);

    const result = await markAllNotificationsReadAction();

    expect(result).toEqual({ ok: true, updated: 3 });
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith("user-2");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/notifications");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not revalidate when mark-all updated nothing", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-2");
    mockMarkAllNotificationsRead.mockResolvedValue(0);

    const result = await markAllNotificationsReadAction();

    expect(result).toEqual({ ok: true, updated: 0 });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("archives notification and revalidates when changed", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-3");
    mockArchiveNotification.mockResolvedValue(true);

    const result = await archiveNotificationAction("noti-7");

    expect(result).toEqual({ ok: true, updated: 1 });
    expect(mockArchiveNotification).toHaveBeenCalledWith("user-3", "noti-7");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/notifications");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("maps archive service errors", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-3");
    mockArchiveNotification.mockRejectedValue(
      new ServiceError("not-found", "NOT_FOUND", 404),
    );

    const result = await archiveNotificationAction("noti-7");

    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "not-found" });
  });
});
