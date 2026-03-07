import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveNotification,
  createNotification,
  listNotificationsByUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/queries/notification.queries";
import { prisma } from "@/lib/prisma";
import {
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  withQueryCache,
} from "@/server/cache/query-cache";

vi.mock("@/server/cache/query-cache", async () => {
  const actual = await vi.importActual<typeof import("@/server/cache/query-cache")>(
    "@/server/cache/query-cache",
  );

  return {
    ...actual,
    createQueryCacheKey: vi.fn(
      async (bucket: string, parts: Record<string, string | number | boolean>) =>
        `cache:${bucket}:${JSON.stringify(parts)}`,
    ),
    withQueryCache: vi.fn(async ({ fetcher }: { fetcher: () => Promise<unknown> }) => fetcher()),
    bumpNotificationUnreadCacheVersion: vi.fn(async () => undefined),
    bumpNotificationListCacheVersion: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      updateMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  notification: {
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockWithQueryCache = vi.mocked(withQueryCache);
const mockBumpUnreadVersion = vi.mocked(bumpNotificationUnreadCacheVersion);
const mockBumpListVersion = vi.mocked(bumpNotificationListCacheVersion);

describe("notification queries cache behavior", () => {
  beforeEach(() => {
    mockPrisma.notification.updateMany.mockReset();
    mockPrisma.notification.create.mockReset();
    mockPrisma.notification.count.mockReset();
    mockPrisma.notification.findMany.mockReset();
    mockWithQueryCache.mockClear();
    mockBumpUnreadVersion.mockReset();
    mockBumpUnreadVersion.mockResolvedValue(undefined);
    mockBumpListVersion.mockReset();
    mockBumpListVersion.mockResolvedValue(undefined);
  });

  it("uses query cache for first-page notification list", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await listNotificationsByUser({
      userId: "user-cache",
      limit: 20,
      kind: "ALL",
      unreadOnly: false,
    });

    expect(mockWithQueryCache).toHaveBeenCalledTimes(1);
  });

  it("bypasses query cache for cursor pagination requests", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await listNotificationsByUser({
      userId: "user-cursor",
      limit: 20,
      cursor: "c1234567890abcdefghijklmn",
      kind: "ALL",
      unreadOnly: false,
    });

    expect(mockWithQueryCache).not.toHaveBeenCalled();
  });

  it("fails closed when notification delegate is missing", async () => {
    const originalDelegate = (mockPrisma as { notification?: unknown }).notification;
    delete (mockPrisma as { notification?: unknown }).notification;

    await expect(
      listNotificationsByUser({
        userId: "user-missing",
        limit: 20,
        kind: "ALL",
        unreadOnly: false,
      }),
    ).rejects.toMatchObject({
      code: "SCHEMA_SYNC_REQUIRED",
      status: 503,
    });

    (mockPrisma as { notification?: unknown }).notification = originalDelegate;
  });
});

describe("notification queries invalidation behavior", () => {
  beforeEach(() => {
    mockPrisma.notification.updateMany.mockReset();
    mockPrisma.notification.create.mockReset();
    mockPrisma.notification.count.mockReset();
    mockPrisma.notification.findMany.mockReset();
    mockWithQueryCache.mockClear();
    mockBumpUnreadVersion.mockReset();
    mockBumpUnreadVersion.mockResolvedValue(undefined);
    mockBumpListVersion.mockReset();
    mockBumpListVersion.mockResolvedValue(undefined);
  });

  it("bumps list/unread cache when marking one notification as read", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const changed = await markNotificationRead("user-1", "noti-1");

    expect(changed).toBe(true);
    expect(mockBumpUnreadVersion).toHaveBeenCalledWith("user-1");
    expect(mockBumpListVersion).toHaveBeenCalledWith("user-1");
  });

  it("does not bump caches when mark-as-read changed nothing", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const changed = await markNotificationRead("user-1", "noti-1");

    expect(changed).toBe(false);
    expect(mockBumpUnreadVersion).not.toHaveBeenCalled();
    expect(mockBumpListVersion).not.toHaveBeenCalled();
  });

  it("bumps list/unread cache when marking all notifications as read", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const updated = await markAllNotificationsRead("user-2");

    expect(updated).toBe(3);
    expect(mockBumpUnreadVersion).toHaveBeenCalledWith("user-2");
    expect(mockBumpListVersion).toHaveBeenCalledWith("user-2");
  });

  it("bumps list/unread cache when archiving notifications", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const changed = await archiveNotification("user-3", "noti-9");

    expect(changed).toBe(true);
    expect(mockBumpUnreadVersion).toHaveBeenCalledWith("user-3");
    expect(mockBumpListVersion).toHaveBeenCalledWith("user-3");
  });

  it("bumps list/unread cache when creating notification", async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: "noti-new" });

    await createNotification({
      userId: "user-4",
      type: "SYSTEM",
      entityType: "SYSTEM",
      entityId: "event-1",
      title: "새 알림",
    });

    expect(mockBumpUnreadVersion).toHaveBeenCalledWith("user-4");
    expect(mockBumpListVersion).toHaveBeenCalledWith("user-4");
  });
});
