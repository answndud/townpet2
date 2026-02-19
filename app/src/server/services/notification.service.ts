import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { createNotification } from "@/server/queries/notification.queries";

type CreateUserNotificationParams = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  postId?: string;
  commentId?: string;
  title: string;
  body?: string;
  metadata?: Prisma.InputJsonValue;
};

type NotifyCommentOnPostParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  postTitle: string;
  commentContent: string;
};

type NotifyReplyToCommentParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  postTitle: string;
  replyContent: string;
};

type NotifyReactionOnPostParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  postTitle: string;
};

function clampText(value: string | null | undefined, maxLength: number) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}...`;
}

export async function createUserNotification({
  userId,
  actorId,
  type,
  entityType,
  entityId,
  postId,
  commentId,
  title,
  body,
  metadata,
}: CreateUserNotificationParams) {
  if (actorId && actorId === userId) {
    return null;
  }

  const safeTitle = clampText(title, 120) || "새 알림이 도착했어요";

  return createNotification({
    userId,
    actorId: actorId ?? null,
    type,
    entityType,
    entityId,
    postId: postId ?? null,
    commentId: commentId ?? null,
    title: safeTitle,
    body: body ? clampText(body, 220) : null,
    metadata,
  });
}

export async function notifyCommentOnPost({
  recipientUserId,
  actorId,
  postId,
  commentId,
  postTitle,
  commentContent,
}: NotifyCommentOnPostParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.COMMENT_ON_POST,
    entityType: NotificationEntityType.COMMENT,
    entityId: commentId,
    postId,
    commentId,
    title: `내 글에 새 댓글이 달렸어요: ${clampText(postTitle, 60)}`,
    body: clampText(commentContent, 140),
  });
}

export async function notifyReplyToComment({
  recipientUserId,
  actorId,
  postId,
  commentId,
  postTitle,
  replyContent,
}: NotifyReplyToCommentParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.REPLY_TO_COMMENT,
    entityType: NotificationEntityType.COMMENT,
    entityId: commentId,
    postId,
    commentId,
    title: `내 댓글에 답글이 달렸어요: ${clampText(postTitle, 60)}`,
    body: clampText(replyContent, 140),
  });
}

export async function notifyReactionOnPost({
  recipientUserId,
  actorId,
  postId,
  postTitle,
}: NotifyReactionOnPostParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.REACTION_ON_POST,
    entityType: NotificationEntityType.REACTION,
    entityId: postId,
    postId,
    title: `내 글에 좋아요가 눌렸어요: ${clampText(postTitle, 60)}`,
  });
}
