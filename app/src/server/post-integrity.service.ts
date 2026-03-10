import { PostReactionType, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RepairDeletedPostIntegrityParams = {
  dryRun?: boolean;
  limit?: number;
};

type ArchiveInvalidNotificationTargetsParams = {
  dryRun?: boolean;
  limit?: number;
};

type RecountPostEngagementCountsParams = {
  dryRun?: boolean;
  limit?: number;
  scope?: PostStatus | "ALL";
};

export type RepairDeletedPostIntegrityResult = {
  scannedPosts: number;
  repairedPosts: number;
  activeCommentsSoftDeleted: number;
  commentReactionsRemoved: number;
  postReactionsRemoved: number;
  bookmarksRemoved: number;
  notificationsArchived: number;
  affectedNotificationUserIds: string[];
};

export type ArchiveInvalidNotificationTargetsResult = {
  scannedNotifications: number;
  archivedNotifications: number;
  affectedUserIds: string[];
};

export type RecountPostEngagementCountsResult = {
  scannedPosts: number;
  updatedPosts: number;
  unchangedPosts: number;
  updatedCommentCounts: number;
  updatedLikeCounts: number;
  updatedDislikeCounts: number;
};

function resolveLimit(limit: number | undefined) {
  if (limit === undefined) {
    return undefined;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("limit must be a positive number when provided.");
  }

  return Math.floor(limit);
}

export async function repairDeletedPostIntegrity({
  dryRun = false,
  limit,
}: RepairDeletedPostIntegrityParams = {}): Promise<RepairDeletedPostIntegrityResult> {
  const safeLimit = resolveLimit(limit);
  const posts = await prisma.post.findMany({
    where: { status: PostStatus.DELETED },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(safeLimit ? { take: safeLimit } : {}),
    select: {
      id: true,
      commentCount: true,
      likeCount: true,
      dislikeCount: true,
    },
  });

  const result: RepairDeletedPostIntegrityResult = {
    scannedPosts: posts.length,
    repairedPosts: 0,
    activeCommentsSoftDeleted: 0,
    commentReactionsRemoved: 0,
    postReactionsRemoved: 0,
    bookmarksRemoved: 0,
    notificationsArchived: 0,
    affectedNotificationUserIds: [],
  };

  for (const post of posts) {
    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
      select: {
        id: true,
        status: true,
        likeCount: true,
        dislikeCount: true,
      },
    });
    const commentIds = comments.map((comment) => comment.id);
    const activeComments = comments.filter((comment) => comment.status === PostStatus.ACTIVE);
    const commentsNeedingNormalization = comments.filter(
      (comment) =>
        comment.status !== PostStatus.DELETED ||
        comment.likeCount !== 0 ||
        comment.dislikeCount !== 0,
    );

    const [commentReactionCount, postReactionCount, bookmarkCount, openNotifications] =
      await Promise.all([
        commentIds.length > 0
          ? prisma.commentReaction.count({
              where: {
                commentId: { in: commentIds },
              },
            })
          : Promise.resolve(0),
        prisma.postReaction.count({
          where: { postId: post.id },
        }),
        prisma.postBookmark.count({
          where: { postId: post.id },
        }),
        prisma.notification.findMany({
          where: {
            postId: post.id,
            archivedAt: null,
          },
          select: {
            id: true,
            userId: true,
          },
        }),
      ]);

    const notificationIds = openNotifications.map((notification) => notification.id);
    const needsRepair =
      activeComments.length > 0 ||
      commentsNeedingNormalization.length > 0 ||
      commentReactionCount > 0 ||
      postReactionCount > 0 ||
      bookmarkCount > 0 ||
      notificationIds.length > 0 ||
      post.commentCount !== 0 ||
      post.likeCount !== 0 ||
      post.dislikeCount !== 0;

    if (!needsRepair) {
      continue;
    }

    result.repairedPosts += 1;
    result.activeCommentsSoftDeleted += activeComments.length;
    result.commentReactionsRemoved += commentReactionCount;
    result.postReactionsRemoved += postReactionCount;
    result.bookmarksRemoved += bookmarkCount;
    result.notificationsArchived += notificationIds.length;
    result.affectedNotificationUserIds.push(
      ...openNotifications.map((notification) => notification.userId),
    );

    if (dryRun) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (commentIds.length > 0) {
        await tx.commentReaction.deleteMany({
          where: {
            commentId: { in: commentIds },
          },
        });

        await tx.comment.updateMany({
          where: {
            postId: post.id,
          },
          data: {
            status: PostStatus.DELETED,
            likeCount: 0,
            dislikeCount: 0,
          },
        });
      }

      await Promise.all([
        tx.postReaction.deleteMany({
          where: { postId: post.id },
        }),
        tx.postBookmark.deleteMany({
          where: { postId: post.id },
        }),
        tx.notification.updateMany({
          where: {
            postId: post.id,
            archivedAt: null,
          },
          data: {
            archivedAt: new Date(),
          },
        }),
        tx.post.update({
          where: { id: post.id },
          data: {
            commentCount: 0,
            likeCount: 0,
            dislikeCount: 0,
          },
        }),
      ]);
    });
  }

  result.affectedNotificationUserIds = Array.from(new Set(result.affectedNotificationUserIds));
  return result;
}

export async function archiveInvalidNotificationTargets({
  dryRun = false,
  limit,
}: ArchiveInvalidNotificationTargetsParams = {}): Promise<ArchiveInvalidNotificationTargetsResult> {
  const safeLimit = resolveLimit(limit);
  const notifications = await prisma.notification.findMany({
    where: {
      archivedAt: null,
      OR: [{ postId: { not: null } }, { commentId: { not: null } }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(safeLimit ? { take: safeLimit } : {}),
    select: {
      id: true,
      userId: true,
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
  });

  const invalidNotifications = notifications.filter((notification) => {
    if (notification.postId && (!notification.post || notification.post.status !== PostStatus.ACTIVE)) {
      return true;
    }

    if (
      notification.commentId &&
      (!notification.comment || notification.comment.status !== PostStatus.ACTIVE)
    ) {
      return true;
    }

    return false;
  });

  if (!dryRun && invalidNotifications.length > 0) {
    await prisma.notification.updateMany({
      where: {
        archivedAt: null,
        id: { in: invalidNotifications.map((notification) => notification.id) },
      },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  return {
    scannedNotifications: notifications.length,
    archivedNotifications: invalidNotifications.length,
    affectedUserIds: Array.from(
      new Set(invalidNotifications.map((notification) => notification.userId)),
    ),
  };
}

export async function recountPostEngagementCounts({
  dryRun = false,
  limit,
  scope = "ALL",
}: RecountPostEngagementCountsParams = {}): Promise<RecountPostEngagementCountsResult> {
  const safeLimit = resolveLimit(limit);
  const where = scope === "ALL" ? {} : { status: scope };
  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(safeLimit ? { take: safeLimit } : {}),
    select: {
      id: true,
      status: true,
      commentCount: true,
      likeCount: true,
      dislikeCount: true,
    },
  });

  const result: RecountPostEngagementCountsResult = {
    scannedPosts: posts.length,
    updatedPosts: 0,
    unchangedPosts: 0,
    updatedCommentCounts: 0,
    updatedLikeCounts: 0,
    updatedDislikeCounts: 0,
  };

  for (const post of posts) {
    const [nextCommentCount, nextLikeCount, nextDislikeCount] =
      post.status === PostStatus.DELETED
        ? [0, 0, 0]
        : await Promise.all([
            prisma.comment.count({
              where: {
                postId: post.id,
                status: PostStatus.ACTIVE,
              },
            }),
            prisma.postReaction.count({
              where: {
                postId: post.id,
                type: PostReactionType.LIKE,
              },
            }),
            prisma.postReaction.count({
              where: {
                postId: post.id,
                type: PostReactionType.DISLIKE,
              },
            }),
          ]);

    const changedCommentCount = post.commentCount !== nextCommentCount;
    const changedLikeCount = post.likeCount !== nextLikeCount;
    const changedDislikeCount = post.dislikeCount !== nextDislikeCount;

    if (!changedCommentCount && !changedLikeCount && !changedDislikeCount) {
      result.unchangedPosts += 1;
      continue;
    }

    result.updatedPosts += 1;
    if (changedCommentCount) {
      result.updatedCommentCounts += 1;
    }
    if (changedLikeCount) {
      result.updatedLikeCounts += 1;
    }
    if (changedDislikeCount) {
      result.updatedDislikeCounts += 1;
    }

    if (dryRun) {
      continue;
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        commentCount: nextCommentCount,
        likeCount: nextLikeCount,
        dislikeCount: nextDislikeCount,
      },
    });
  }

  return result;
}
