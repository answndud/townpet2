import { PostReactionType, PostStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  archiveInvalidNotificationTargets,
  recountPostEngagementCounts,
  repairDeletedPostIntegrity,
} from "@/server/post-integrity.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    commentReaction: {
      count: vi.fn(),
    },
    postReaction: {
      count: vi.fn(),
    },
    postBookmark: {
      count: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  comment: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  commentReaction: {
    count: ReturnType<typeof vi.fn>;
  };
  postReaction: {
    count: ReturnType<typeof vi.fn>;
  };
  postBookmark: {
    count: ReturnType<typeof vi.fn>;
  };
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("post integrity service", () => {
  beforeEach(() => {
    mockPrisma.post.findMany.mockReset();
    mockPrisma.post.update.mockReset();
    mockPrisma.comment.findMany.mockReset();
    mockPrisma.comment.count.mockReset();
    mockPrisma.commentReaction.count.mockReset();
    mockPrisma.postReaction.count.mockReset();
    mockPrisma.postBookmark.count.mockReset();
    mockPrisma.notification.findMany.mockReset();
    mockPrisma.notification.updateMany.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  it("repairs deleted posts by zeroing counts and archiving notifications", async () => {
    const commentReactionDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const commentUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const postReactionDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const postBookmarkDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const notificationUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const postUpdate = vi.fn().mockResolvedValue({ id: "post-1" });

    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-1",
        commentCount: 3,
        likeCount: 2,
        dislikeCount: 1,
      },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: "comment-1",
        status: PostStatus.ACTIVE,
        likeCount: 1,
        dislikeCount: 0,
      },
      {
        id: "comment-2",
        status: PostStatus.DELETED,
        likeCount: 3,
        dislikeCount: 1,
      },
    ]);
    mockPrisma.commentReaction.count.mockResolvedValue(2);
    mockPrisma.postReaction.count.mockResolvedValue(1);
    mockPrisma.postBookmark.count.mockResolvedValue(1);
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: "noti-1", userId: "user-1" },
      { id: "noti-2", userId: "user-2" },
    ]);
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        commentReaction: { deleteMany: commentReactionDeleteMany },
        comment: { updateMany: commentUpdateMany },
        postReaction: { deleteMany: postReactionDeleteMany },
        postBookmark: { deleteMany: postBookmarkDeleteMany },
        notification: { updateMany: notificationUpdateMany },
        post: { update: postUpdate },
      } as never),
    );

    const result = await repairDeletedPostIntegrity();

    expect(result).toEqual({
      scannedPosts: 1,
      repairedPosts: 1,
      activeCommentsSoftDeleted: 1,
      commentReactionsRemoved: 2,
      postReactionsRemoved: 1,
      bookmarksRemoved: 1,
      notificationsArchived: 2,
      affectedNotificationUserIds: ["user-1", "user-2"],
    });
    expect(commentReactionDeleteMany).toHaveBeenCalledWith({
      where: {
        commentId: { in: ["comment-1", "comment-2"] },
      },
    });
    expect(commentUpdateMany).toHaveBeenCalledWith({
      where: {
        postId: "post-1",
      },
      data: {
        status: PostStatus.DELETED,
        likeCount: 0,
        dislikeCount: 0,
      },
    });
    expect(postUpdate).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      },
    });
  });

  it("supports dry-run deleted post repair without mutating rows", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-2",
        commentCount: 1,
        likeCount: 0,
        dislikeCount: 0,
      },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: "comment-9",
        status: PostStatus.ACTIVE,
        likeCount: 0,
        dislikeCount: 0,
      },
    ]);
    mockPrisma.commentReaction.count.mockResolvedValue(0);
    mockPrisma.postReaction.count.mockResolvedValue(0);
    mockPrisma.postBookmark.count.mockResolvedValue(0);
    mockPrisma.notification.findMany.mockResolvedValue([]);

    const result = await repairDeletedPostIntegrity({ dryRun: true });

    expect(result.repairedPosts).toBe(1);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("archives notifications that point to deleted comments", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      {
        id: "noti-3",
        userId: "user-3",
        postId: "post-3",
        commentId: "comment-3",
        post: { id: "post-3", status: PostStatus.ACTIVE },
        comment: { id: "comment-3", status: PostStatus.DELETED },
      },
      {
        id: "noti-4",
        userId: "user-4",
        postId: "post-4",
        commentId: null,
        post: { id: "post-4", status: PostStatus.ACTIVE },
        comment: null,
      },
    ]);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const result = await archiveInvalidNotificationTargets();

    expect(result).toEqual({
      scannedNotifications: 2,
      archivedNotifications: 1,
      affectedUserIds: ["user-3"],
    });
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        archivedAt: null,
        id: { in: ["noti-3"] },
      },
      data: {
        archivedAt: expect.any(Date),
      },
    });
  });

  it("recounts engagement counts for active posts", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-5",
        status: PostStatus.ACTIVE,
        commentCount: 5,
        likeCount: 0,
        dislikeCount: 0,
      },
      {
        id: "post-6",
        status: PostStatus.ACTIVE,
        commentCount: 1,
        likeCount: 2,
        dislikeCount: 0,
      },
    ]);
    mockPrisma.comment.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    mockPrisma.postReaction.count
      .mockImplementation(
        ({ where }: { where: { postId: string; type: PostReactionType } }) => {
          if (where.postId === "post-5") {
            return where.type === PostReactionType.LIKE ? Promise.resolve(4) : Promise.resolve(1);
          }
          return where.type === PostReactionType.LIKE ? Promise.resolve(2) : Promise.resolve(0);
        },
      );
    mockPrisma.post.update.mockResolvedValue({});

    const result = await recountPostEngagementCounts({
      scope: PostStatus.ACTIVE,
    });

    expect(result).toEqual({
      scannedPosts: 2,
      updatedPosts: 1,
      unchangedPosts: 1,
      updatedCommentCounts: 1,
      updatedLikeCounts: 1,
      updatedDislikeCounts: 1,
    });
    expect(mockPrisma.post.update).toHaveBeenCalledWith({
      where: { id: "post-5" },
      data: {
        commentCount: 3,
        likeCount: 4,
        dislikeCount: 1,
      },
    });
  });
});
