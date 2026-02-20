import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from "@prisma/client";

import type { NotificationFilterKind } from "@/lib/notification-filter";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

type ListNotificationsByUserOptions = {
  userId: string;
  limit?: number;
  cursor?: string;
  kind?: NotificationFilterKind;
  unreadOnly?: boolean;
};

type CreateNotificationParams = {
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
        name: true;
        image: true;
      };
    };
  };
}>;

type ListNotificationsByUserResult = {
  items: NotificationListItem[];
  nextCursor: string | null;
};

type NotificationDelegate = {
  findMany(args: Prisma.NotificationFindManyArgs): Promise<NotificationListItem[]>;
  count(args: Prisma.NotificationCountArgs): Promise<number>;
  updateMany(args: Prisma.NotificationUpdateManyArgs): Promise<{ count: number }>;
  create(args: Prisma.NotificationCreateArgs): Promise<unknown>;
};

let notificationTableMissingWarned = false;
let missingDelegateWarned = false;

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

function isNotificationTableMissingError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
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

export async function listNotificationsByUser({
  userId,
  limit = 20,
  cursor,
  kind = "ALL",
  unreadOnly = false,
}: ListNotificationsByUserOptions): Promise<ListNotificationsByUserResult> {
  const delegate = getNotificationDelegate();
  if (!delegate) {
    return { items: [], nextCursor: null };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const typeFilter =
    kind === "COMMENT"
      ? [NotificationType.COMMENT_ON_POST, NotificationType.REPLY_TO_COMMENT]
      : kind === "REACTION"
        ? [NotificationType.REACTION_ON_POST]
        : kind === "SYSTEM"
          ? [NotificationType.SYSTEM]
          : null;

  let items: NotificationListItem[];
  try {
    items = await delegate.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(typeFilter ? { type: { in: typeFilter } } : {}),
      },
      take: safeLimit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        actor: {
          select: {
            id: true,
            nickname: true,
            name: true,
            image: true,
          },
        },
      },
    });
  } catch (error) {
    if (!isNotificationTableMissingError(error)) {
      throw error;
    }
    warnMissingNotificationTable(error);
    return { items: [], nextCursor: null };
  }

  let nextCursor: string | null = null;
  if (items.length > safeLimit) {
    const next = items.pop();
    nextCursor = next?.id ?? null;
  }

  return { items, nextCursor };
}

export async function countUnreadNotifications(userId: string) {
  const delegate = getNotificationDelegate();
  if (!delegate) {
    return 0;
  }

  try {
    return await delegate.count({
      where: {
        userId,
        isRead: false,
      },
    });
  } catch (error) {
    if (!isNotificationTableMissingError(error)) {
      throw error;
    }
    warnMissingNotificationTable(error);
    return 0;
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const delegate = getNotificationDelegate();
  if (!delegate) {
    return false;
  }

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    if (!isNotificationTableMissingError(error)) {
      throw error;
    }
    warnMissingNotificationTable(error);
    return false;
  }

  return result.count > 0;
}

export async function markAllNotificationsRead(userId: string) {
  const delegate = getNotificationDelegate();
  if (!delegate) {
    return 0;
  }

  let result: { count: number };
  try {
    result = await delegate.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    if (!isNotificationTableMissingError(error)) {
      throw error;
    }
    warnMissingNotificationTable(error);
    return 0;
  }

  return result.count;
}

export async function createNotification(params: CreateNotificationParams) {
  const delegate = getNotificationDelegate();
  if (!delegate) {
    return null;
  }

  try {
    return await delegate.create({
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
    });
  } catch (error) {
    if (!isNotificationTableMissingError(error)) {
      throw error;
    }
    warnMissingNotificationTable(error);
    return null;
  }
}
