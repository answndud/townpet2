import {
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationType,
  PostStatus,
  Prisma,
} from "@prisma/client";

import type { NotificationFilterKind } from "@/lib/notification-filter";
import { prisma } from "@/lib/prisma";
import {
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  createQueryCacheKey,
  withQueryCache,
} from "@/server/cache/query-cache";
import { logger, serializeError } from "@/server/logger";
import { assertSchemaDelegate, rethrowSchemaSyncRequired } from "@/server/schema-sync";

type ListNotificationsByUserOptions = {
  userId: string;
  limit?: number;
  cursor?: string;
  page?: number;
  kind?: NotificationFilterKind;
  unreadOnly?: boolean;
};

type CreateNotificationParams = {
  deliveryId?: string | null;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  postId?: string | null;
  commentId?: string | null;
  title: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type NotificationListItem = Prisma.NotificationGetPayload<{
  include: {
    actor: {
      select: {
        id: true;
        nickname: true;
        image: true;
      };
    };
  };
}>;

type NotificationTargetItem = Prisma.NotificationGetPayload<{
  select: {
    id: true;
    userId: true;
    isRead: true;
    archivedAt: true;
    postId: true;
    commentId: true;
    post: {
      select: {
        id: true;
        status: true;
      };
    };
    comment: {
      select: {
        id: true;
        status: true;
      };
    };
  };
}>;

type NotificationDeliveryRecord = Prisma.NotificationDeliveryGetPayload<{
  select: {
    id: true;
    userId: true;
    actorId: true;
    type: true;
    entityType: true;
    entityId: true;
    postId: true;
    commentId: true;
    title: true;
    body: true;
    metadata: true;
    status: true;
    attempts: true;
  };
}>;

type ListNotificationsByUserResult = {
  items: NotificationListItem[];
  nextCursor: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
};

type NotificationDelegate = {
  findMany(args: Prisma.NotificationFindManyArgs): Promise<unknown[]>;
  findUnique(args: Prisma.NotificationFindUniqueArgs): Promise<unknown>;
  count(args: Prisma.NotificationCountArgs): Promise<number>;
  updateMany(args: Prisma.NotificationUpdateManyArgs): Promise<{ count: number }>;
  create(args: Prisma.NotificationCreateArgs): Promise<unknown>;
};

type NotificationDeliveryDelegate = {
  create(args: Prisma.NotificationDeliveryCreateArgs): Promise<unknown>;
  findUnique(args: Prisma.NotificationDeliveryFindUniqueArgs): Promise<unknown>;
  findMany(args: Prisma.NotificationDeliveryFindManyArgs): Promise<unknown[]>;
  update(args: Prisma.NotificationDeliveryUpdateArgs): Promise<unknown>;
};

let notificationTableMissingWarned = false;
let missingDelegateWarned = false;
let notificationDeliveryTableMissingWarned = false;
let missingDeliveryDelegateWarned = false;

function getNotificationDelegate() {
  const delegate = (
    prisma as unknown as { notification?: NotificationDelegate }
  ).notification;

  if (!delegate && !missingDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 Notification 모델이 없어 알림 기능을 비활성화합니다.");
  }

  return delegate ?? null;
}

function getNotificationDeliveryDelegate() {
  const delegate = (
    prisma as unknown as { notificationDelivery?: NotificationDeliveryDelegate }
  ).notificationDelivery;

  if (!delegate && !missingDeliveryDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDeliveryDelegateWarned = true;
    logger.warn(
      "Prisma Client에 NotificationDelivery 모델이 없어 알림 delivery outbox를 비활성화합니다.",
    );
  }

  return delegate ?? null;
}

function warnMissingNotificationTable(error: unknown) {
  if (notificationTableMissingWarned) {
    return;
  }
  notificationTableMissingWarned = true;
  logger.warn("Notification 테이블이 없어 알림 기능을 비활성화합니다.", {
    error: serializeError(error),
  });
}

function warnMissingNotificationDeliveryTable(error: unknown) {
  if (notificationDeliveryTableMissingWarned) {
    return;
  }
  notificationDeliveryTableMissingWarned = true;
  logger.warn("NotificationDelivery 테이블이 없어 알림 outbox를 비활성화합니다.", {
    error: serializeError(error),
  });
}

function requireNotificationDelegate() {
  return assertSchemaDelegate(
    getNotificationDelegate(),
    "Notification 모델이 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function requireNotificationDeliveryDelegate() {
  return assertSchemaDelegate(
    getNotificationDeliveryDelegate(),
    "NotificationDelivery 모델이 누락되어 알림 outbox를 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function throwNotificationSchemaSyncRequired(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    warnMissingNotificationTable(error);
  }

  rethrowSchemaSyncRequired(
    error,
    "Notification 스키마가 누락되어 알림 기능을 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    {
      columns: ["Notification.archivedAt"],
    },
  );
}

function throwNotificationDeliverySchemaSyncRequired(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    warnMissingNotificationDeliveryTable(error);
  }

  rethrowSchemaSyncRequired(
    error,
    "NotificationDelivery 스키마가 누락되어 알림 outbox를 사용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    {
      columns: ["NotificationDelivery.status"],
    },
  );
}

function bumpNotificationCaches(userId: string) {
  void bumpNotificationUnreadCacheVersion(userId).catch(() => undefined);
  void bumpNotificationListCacheVersion(userId).catch(() => undefined);
}

function normalizeNotificationDeliveryError(error: unknown) {
  const fallback = "알림 전달에 실패했습니다.";
  const message =
    error instanceof Error && error.message.trim().length > 0 ? error.message.trim() : fallback;
  return message.slice(0, 500);
}

async function archiveUnavailableNotificationsForUser(userId: string) {
  const delegate = requireNotificationDelegate();

  let candidates: Array<{
    id: string;
    postId: string | null;
    commentId: string | null;
    post: { id: string; status: PostStatus } | null;
    comment: { id: string; status: PostStatus } | null;
  }>;
  try {
    candidates = (await delegate.findMany({
      where: {
        userId,
        archivedAt: null,
        postId: { not: null },
      },
      select: {
        id: true,
        postId: true,
        commentId: true,
        post: {
          select: {
            id: true,
            status: true,
          },
        },
        comment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })) as Array<{
      id: string;
      postId: string | null;
      commentId: string | null;
      post: { id: string; status: PostStatus } | null;
      comment: { id: string; status: PostStatus } | null;
    }>;
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  const invalidIds = candidates
    .filter(
      (candidate) =>
        (candidate.postId && (!candidate.post || candidate.post.status !== PostStatus.ACTIVE)) ||
        (candidate.commentId &&
          (!candidate.comment || candidate.comment.status !== PostStatus.ACTIVE)),
    )
    .map((candidate) => candidate.id);

  if (invalidIds.length === 0) {
    return 0;
  }

  try {
    await delegate.updateMany({
      where: {
        userId,
        archivedAt: null,
        id: { in: invalidIds },
      },
      data: {
        archivedAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  bumpNotificationCaches(userId);
  return invalidIds.length;
}

export async function listNotificationsByUser({
  userId,
  limit = 20,
  cursor,
  page = 1,
  kind = "ALL",
  unreadOnly = false,
}: ListNotificationsByUserOptions): Promise<ListNotificationsByUserResult> {
  const delegate = requireNotificationDelegate();
  await flushNotificationDeliveriesForUser(userId);
  await archiveUnavailableNotificationsForUser(userId);

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const typeFilter =
    kind === "COMMENT"
      ? [
          NotificationType.COMMENT_ON_POST,
          NotificationType.REPLY_TO_COMMENT,
          NotificationType.MENTION_IN_COMMENT,
        ]
      : kind === "REACTION"
        ? [NotificationType.REACTION_ON_POST, NotificationType.REACTION_ON_COMMENT]
        : kind === "SYSTEM"
          ? [NotificationType.SYSTEM]
          : null;
  const where: Prisma.NotificationWhereInput = {
    userId,
    archivedAt: null,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(typeFilter ? { type: { in: typeFilter } } : {}),
  };

  const fetchNotificationItems = async (): Promise<ListNotificationsByUserResult> => {
    let items: NotificationListItem[];
    let totalCount = 0;
    try {
      totalCount = await delegate.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
      const resolvedPage = Math.min(safePage, totalPages);

      items = (await delegate.findMany({
        where,
        take: cursor ? safeLimit + 1 : safeLimit,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : resolvedPage > 1
            ? {
                skip: (resolvedPage - 1) * safeLimit,
              }
            : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          actor: {
            select: {
              id: true,
              nickname: true,
              image: true,
            },
          },
        },
      })) as NotificationListItem[];
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }

    let nextCursor: string | null = null;
    if (cursor && items.length > safeLimit) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
    return {
      items,
      nextCursor,
      page: Math.min(safePage, totalPages),
      totalPages,
      totalCount,
    };
  };

  if (cursor || safePage > 1) {
    return fetchNotificationItems();
  }

  return withQueryCache({
    key: await createQueryCacheKey(`notification-list:${userId}`, {
      limit: safeLimit,
      kind,
      unreadOnly: unreadOnly ? "1" : "0",
    }),
    ttlSeconds: 5,
    fetcher: fetchNotificationItems,
  });
}

export async function countUnreadNotifications(userId: string) {
  const delegate = requireNotificationDelegate();
  await flushNotificationDeliveriesForUser(userId);
  await archiveUnavailableNotificationsForUser(userId);

  const fetchUnreadCount = async () => {
    try {
      return await delegate.count({
        where: {
          userId,
          archivedAt: null,
          isRead: false,
        },
      });
    } catch (error) {
      throwNotificationSchemaSyncRequired(error);
    }
  };

  return withQueryCache({
    key: await createQueryCacheKey(`notification-unread:${userId}`, {
      type: "count",
    }),
    ttlSeconds: 5,
    fetcher: fetchUnreadCount,
  });
}

export async function createNotificationDelivery(params: CreateNotificationParams) {
  const delegate = requireNotificationDeliveryDelegate();

  try {
    return (await delegate.create({
      data: {
        userId: params.userId,
        actorId: params.actorId ?? null,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        postId: params.postId ?? null,
        commentId: params.commentId ?? null,
        title: params.title,
        body: params.body ?? null,
        metadata: params.metadata,
      },
      select: {
        id: true,
      },
    })) as { id: string };
  } catch (error) {
    throwNotificationDeliverySchemaSyncRequired(error);
  }
}

export async function deliverNotificationDelivery(deliveryId: string) {
  const notificationDelegate = requireNotificationDelegate();
  const deliveryDelegate = requireNotificationDeliveryDelegate();

  let delivery: NotificationDeliveryRecord | null;
  try {
    delivery = (await deliveryDelegate.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        userId: true,
        actorId: true,
        type: true,
        entityType: true,
        entityId: true,
        postId: true,
        commentId: true,
        title: true,
        body: true,
        metadata: true,
        status: true,
        attempts: true,
      },
    })) as NotificationDeliveryRecord | null;
  } catch (error) {
    throwNotificationDeliverySchemaSyncRequired(error);
  }

  if (!delivery || delivery.status === NotificationDeliveryStatus.DELIVERED) {
    return null;
  }

  try {
    await notificationDelegate.create({
      data: {
        deliveryId: delivery.id,
        userId: delivery.userId,
        actorId: delivery.actorId ?? null,
        type: delivery.type,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
        postId: delivery.postId ?? null,
        commentId: delivery.commentId ?? null,
        title: delivery.title,
        body: delivery.body ?? null,
        metadata: delivery.metadata ?? undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        await deliveryDelegate.update({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.DELIVERED,
            attempts: { increment: 1 },
            deliveredAt: new Date(),
            lastError: null,
          },
        });
      } catch (deliveryUpdateError) {
        throwNotificationDeliverySchemaSyncRequired(deliveryUpdateError);
      }
      bumpNotificationCaches(delivery.userId);
      return { delivered: true };
    }

    try {
      await deliveryDelegate.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          attempts: { increment: 1 },
          scheduledAt: new Date(),
          lastError: normalizeNotificationDeliveryError(error),
        },
      });
    } catch (deliveryUpdateError) {
      throwNotificationDeliverySchemaSyncRequired(deliveryUpdateError);
    }

    throwNotificationSchemaSyncRequired(error);
  }

  try {
    await deliveryDelegate.update({
      where: { id: delivery.id },
      data: {
        status: NotificationDeliveryStatus.DELIVERED,
        attempts: { increment: 1 },
        deliveredAt: new Date(),
        lastError: null,
      },
    });
  } catch (error) {
    throwNotificationDeliverySchemaSyncRequired(error);
  }

  bumpNotificationCaches(delivery.userId);
  return { delivered: true };
}

export async function flushNotificationDeliveriesForUser(userId: string, limit = 20) {
  const delegate = requireNotificationDeliveryDelegate();

  let deliveries: Array<{ id: string }>;
  try {
    deliveries = (await delegate.findMany({
      where: {
        userId,
        status: {
          in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.FAILED],
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
      },
    })) as Array<{ id: string }>;
  } catch (error) {
    throwNotificationDeliverySchemaSyncRequired(error);
  }

  for (const delivery of deliveries) {
    try {
      await deliverNotificationDelivery(delivery.id);
    } catch (error) {
      logger.warn("알림 delivery outbox 재처리에 실패했습니다.", {
        userId,
        deliveryId: delivery.id,
        error: serializeError(error),
      });
    }
  }

  return deliveries.length;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        id: notificationId,
        userId,
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  const changed = result.count > 0;
  if (changed) {
    bumpNotificationCaches(userId);
  }

  return changed;
}

export async function markAllNotificationsRead(userId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        userId,
        archivedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  if (result.count > 0) {
    bumpNotificationCaches(userId);
  }

  return result.count;
}

export async function archiveNotification(userId: string, notificationId: string) {
  const delegate = requireNotificationDelegate();

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        id: notificationId,
        userId,
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  const changed = result.count > 0;
  if (changed) {
    bumpNotificationCaches(userId);
  }

  return changed;
}

export async function createNotification(params: CreateNotificationParams) {
  const delegate = requireNotificationDelegate();

  try {
    const created = await delegate.create({
      data: {
        userId: params.userId,
        deliveryId: params.deliveryId ?? null,
        actorId: params.actorId ?? null,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        postId: params.postId ?? null,
        commentId: params.commentId ?? null,
        title: params.title,
        body: params.body ?? null,
        metadata: params.metadata,
      },
    });

    bumpNotificationCaches(params.userId);
    return created;
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }
}

export async function getNotificationNavigationTarget(userId: string, notificationId: string) {
  const delegate = requireNotificationDelegate();

  let notification: NotificationTargetItem | null;
  try {
    notification = (await delegate.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        userId: true,
        isRead: true,
        archivedAt: true,
        postId: true,
        commentId: true,
        post: {
          select: {
            id: true,
            status: true,
          },
        },
        comment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })) as NotificationTargetItem | null;
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }

  if (!notification || notification.userId !== userId || notification.archivedAt) {
    return {
      href: "/notifications",
      archived: false,
      found: false,
    };
  }

  if (notification.postId && (!notification.post || notification.post.status !== PostStatus.ACTIVE)) {
    await archiveNotification(userId, notification.id);
    return {
      href: "/notifications?notice=TARGET_UNAVAILABLE",
      archived: true,
      found: true,
    };
  }

  if (
    notification.commentId &&
    (!notification.comment || notification.comment.status !== PostStatus.ACTIVE)
  ) {
    await archiveNotification(userId, notification.id);
    return {
      href: "/notifications?notice=TARGET_UNAVAILABLE",
      archived: true,
      found: true,
    };
  }

  if (!notification.isRead) {
    await markNotificationRead(userId, notification.id);
  }

  if (notification.postId && notification.commentId && notification.comment) {
    return {
      href: `/posts/${notification.postId}#comment-${notification.commentId}`,
      archived: false,
      found: true,
    };
  }

  if (notification.postId) {
    return {
      href: `/posts/${notification.postId}`,
      archived: false,
      found: true,
    };
  }

  return {
    href: "/notifications",
    archived: false,
    found: true,
  };
}

export async function assertNotificationControlPlaneReady() {
  const delegate = requireNotificationDelegate();

  try {
    await delegate.count({
      where: {
        userId: "__schema_probe__",
        archivedAt: null,
        isRead: false,
      },
    });
  } catch (error) {
    throwNotificationSchemaSyncRequired(error);
  }
}
