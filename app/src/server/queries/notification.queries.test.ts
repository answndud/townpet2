import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDeliveryStatus, PostStatus } from "@prisma/client";

import {
  archiveNotification,
  createNotification,
  createNotificationDelivery,
  deliverNotificationDelivery,
  flushNotificationDeliveriesForUser,
  getNotificationNavigationTarget,
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
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  notification: {
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  notificationDelivery: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockWithQueryCache = vi.mocked(withQueryCache);
const mockBumpUnreadVersion = vi.mocked(bumpNotificationUnreadCacheVersion);
const mockBumpListVersion = vi.mocked(bumpNotificationListCacheVersion);

describe("notification queries cache behavior", () => {
  beforeEach(() => {
    mockPrisma.notification.updateMany.mockReset();
    mockPrisma.notification.findUnique.mockReset();
    mockPrisma.notification.create.mockReset();
    mockPrisma.notification.count.mockReset();
    mockPrisma.notification.findMany.mockReset();
    mockPrisma.notificationDelivery.create.mockReset();
    mockPrisma.notificationDelivery.findUnique.mockReset();
    mockPrisma.notificationDelivery.findMany.mockReset();
    mockPrisma.notificationDelivery.update.mockReset();
    mockWithQueryCache.mockClear();
    mockBumpUnreadVersion.mockReset();
    mockBumpUnreadVersion.mockResolvedValue(undefined);
    mockBumpListVersion.mockReset();
    mockBumpListVersion.mockResolvedValue(undefined);
    mockPrisma.notification.count.mockResolvedValue(0);
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notificationDelivery.findMany.mockResolvedValue([]);
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

  it("bypasses query cache for later pages", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await listNotificationsByUser({
      userId: "user-page",
      limit: 20,
      page: 2,
      kind: "ALL",
      unreadOnly: false,
    });

    expect(mockWithQueryCache).not.toHaveBeenCalled();
  });

  it("includes mention notifications in the comment filter", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await listNotificationsByUser({
      userId: "user-comment-filter",
      limit: 20,
      kind: "COMMENT",
      unreadOnly: false,
    });

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-comment-filter",
          type: {
            in: ["COMMENT_ON_POST", "REPLY_TO_COMMENT", "MENTION_IN_COMMENT"],
          },
        }),
      }),
    );
  });

  it("includes comment reactions in the reaction filter", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await listNotificationsByUser({
      userId: "user-reaction-filter",
      limit: 20,
      kind: "REACTION",
      unreadOnly: false,
    });

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-reaction-filter",
          type: {
            in: ["REACTION_ON_POST", "REACTION_ON_COMMENT"],
          },
        }),
      }),
    );
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
    mockPrisma.notification.findUnique.mockReset();
    mockPrisma.notification.create.mockReset();
    mockPrisma.notification.count.mockReset();
    mockPrisma.notification.findMany.mockReset();
    mockPrisma.notificationDelivery.create.mockReset();
    mockPrisma.notificationDelivery.findUnique.mockReset();
    mockPrisma.notificationDelivery.findMany.mockReset();
    mockPrisma.notificationDelivery.update.mockReset();
    mockWithQueryCache.mockClear();
    mockBumpUnreadVersion.mockReset();
    mockBumpUnreadVersion.mockResolvedValue(undefined);
    mockBumpListVersion.mockReset();
    mockBumpListVersion.mockResolvedValue(undefined);
    mockPrisma.notification.count.mockResolvedValue(0);
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notificationDelivery.findMany.mockResolvedValue([]);
  });

  it("bumps list/unread cache when marking one notification as read", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const changed = await markNotificationRead("user-1", "noti-1");

    expect(changed).toBe(true);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: "noti-1",
        userId: "user-1",
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: expect.any(Date),
      },
    });
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
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-2",
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: expect.any(Date),
      },
    });
    expect(mockBumpUnreadVersion).toHaveBeenCalledWith("user-2");
    expect(mockBumpListVersion).toHaveBeenCalledWith("user-2");
  });

  it("bumps list/unread cache when archiving notifications", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const changed = await archiveNotification("user-3", "noti-9");

    expect(changed).toBe(true);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: "noti-9",
        userId: "user-3",
        archivedAt: null,
      },
      data: {
        archivedAt: expect.any(Date),
      },
    });
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

  it("stores notification delivery outbox rows", async () => {
    mockPrisma.notificationDelivery.create.mockResolvedValue({ id: "delivery-1" });

    const created = await createNotificationDelivery({
      userId: "user-5",
      type: "SYSTEM",
      entityType: "SYSTEM",
      entityId: "event-2",
      title: "대기중 알림",
    });

    expect(created).toEqual({ id: "delivery-1" });
    expect(mockPrisma.notificationDelivery.create).toHaveBeenCalledWith({
      data: {
        userId: "user-5",
        actorId: null,
        type: "SYSTEM",
        entityType: "SYSTEM",
        entityId: "event-2",
        postId: null,
        commentId: null,
        title: "대기중 알림",
        body: null,
        metadata: undefined,
      },
      select: {
        id: true,
      },
    });
  });

  it("delivers queued notifications and marks the outbox row delivered", async () => {
    mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
      id: "delivery-2",
      userId: "user-6",
      actorId: "actor-1",
      type: "COMMENT_ON_POST",
      entityType: "COMMENT",
      entityId: "comment-1",
      postId: "post-1",
      commentId: "comment-1",
      title: "새 댓글",
      body: "내용",
      metadata: null,
      status: NotificationDeliveryStatus.PENDING,
      attempts: 0,
    });
    mockPrisma.notification.create.mockResolvedValue({ id: "noti-2" });
    mockPrisma.notificationDelivery.update.mockResolvedValue({});

    await deliverNotificationDelivery("delivery-2");

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        deliveryId: "delivery-2",
        userId: "user-6",
        actorId: "actor-1",
        type: "COMMENT_ON_POST",
        entityType: "COMMENT",
        entityId: "comment-1",
        postId: "post-1",
        commentId: "comment-1",
        title: "새 댓글",
        body: "내용",
        metadata: undefined,
      },
    });
    expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-2" },
      data: {
        status: NotificationDeliveryStatus.DELIVERED,
        attempts: { increment: 1 },
        deliveredAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it("flushes pending/failed deliveries for the same user", async () => {
    mockPrisma.notificationDelivery.findMany
      .mockResolvedValueOnce([
        { id: "delivery-a" },
        { id: "delivery-b" },
      ])
      .mockResolvedValue([]);
    mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
      id: "delivery-a",
      userId: "user-7",
      actorId: null,
      type: "SYSTEM",
      entityType: "SYSTEM",
      entityId: "event-a",
      postId: null,
      commentId: null,
      title: "a",
      body: null,
      metadata: null,
      status: NotificationDeliveryStatus.FAILED,
      attempts: 1,
    });
    mockPrisma.notification.create.mockResolvedValue({ id: "noti-a" });
    mockPrisma.notificationDelivery.update.mockResolvedValue({});

    await flushNotificationDeliveriesForUser("user-7", 5);

    expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-7",
        status: {
          in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED],
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      take: 5,
      select: {
        id: true,
      },
    });
  });

  it("archives notifications whose post target was deleted before counting", async () => {
    mockPrisma.notification.findMany
      .mockResolvedValueOnce([
        {
          id: "noti-stale",
          postId: "post-deleted",
          commentId: null,
          post: { id: "post-deleted", status: PostStatus.DELETED },
          comment: null,
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notification.count.mockResolvedValue(0);

    await listNotificationsByUser({
      userId: "user-cleanup",
      kind: "ALL",
      unreadOnly: false,
    });

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-cleanup",
        archivedAt: null,
        id: { in: ["noti-stale"] },
      },
      data: {
        archivedAt: expect.any(Date),
      },
    });
  });

  it("archives notifications whose comment target was deleted before counting", async () => {
    mockPrisma.notification.findMany
      .mockResolvedValueOnce([
        {
          id: "noti-comment-stale",
          postId: "post-active",
          commentId: "comment-deleted",
          post: { id: "post-active", status: PostStatus.ACTIVE },
          comment: { id: "comment-deleted", status: PostStatus.DELETED },
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notification.count.mockResolvedValue(0);

    await listNotificationsByUser({
      userId: "user-comment-cleanup",
      kind: "ALL",
      unreadOnly: false,
    });

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-comment-cleanup",
        archivedAt: null,
        id: { in: ["noti-comment-stale"] },
      },
      data: {
        archivedAt: expect.any(Date),
      },
    });
  });

  it("redirects to unavailable notice when comment target is gone", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: "noti-nav",
      userId: "user-8",
      isRead: false,
      archivedAt: null,
      postId: "post-8",
      commentId: "comment-missing",
      post: { id: "post-8", status: PostStatus.ACTIVE },
      comment: null,
    });
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const target = await getNotificationNavigationTarget("user-8", "noti-nav");

    expect(target).toEqual({
      href: "/notifications?notice=TARGET_UNAVAILABLE",
      archived: true,
      found: true,
    });
  });
});
