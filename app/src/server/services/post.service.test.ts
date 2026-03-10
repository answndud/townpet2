import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostReactionType, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyReactionOnPost } from "@/server/services/notification.service";
import {
  deletePost,
  registerPostView,
  togglePostBookmark,
  togglePostReaction,
} from "@/server/services/post.service";
import {
  bumpFeedCacheVersion,
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    postBookmark: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
    },
    userSanction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notifyReactionOnPost: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/cache/query-cache", () => ({
  bumpFeedCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSearchCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSuggestCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostDetailCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostCommentsCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpNotificationUnreadCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpNotificationListCacheVersion: vi.fn().mockResolvedValue(undefined),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  postBookmark: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  userBlock: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  userSanction: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};
const mockNotifyReactionOnPost = vi.mocked(notifyReactionOnPost);
const mockBumpFeedCacheVersion = vi.mocked(bumpFeedCacheVersion);
const mockBumpSearchCacheVersion = vi.mocked(bumpSearchCacheVersion);
const mockBumpSuggestCacheVersion = vi.mocked(bumpSuggestCacheVersion);
const mockBumpPostDetailCacheVersion = vi.mocked(bumpPostDetailCacheVersion);
const mockBumpPostCommentsCacheVersion = vi.mocked(bumpPostCommentsCacheVersion);
const mockBumpNotificationUnreadCacheVersion = vi.mocked(bumpNotificationUnreadCacheVersion);
const mockBumpNotificationListCacheVersion = vi.mocked(bumpNotificationListCacheVersion);

describe("post reaction toggle", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.post.update.mockReset();
    mockPrisma.postBookmark.findUnique.mockReset();
    mockPrisma.postBookmark.create.mockReset();
    mockPrisma.postBookmark.delete.mockReset();
    mockPrisma.userBlock.findFirst.mockReset();
    mockPrisma.userBlock.findFirst.mockResolvedValue(null);
    mockPrisma.userSanction.findFirst.mockReset();
    mockPrisma.userSanction.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockReset();
    mockNotifyReactionOnPost.mockReset();
    mockNotifyReactionOnPost.mockResolvedValue(null);
    mockBumpFeedCacheVersion.mockReset();
    mockBumpFeedCacheVersion.mockResolvedValue(undefined);
    mockBumpSearchCacheVersion.mockReset();
    mockBumpSearchCacheVersion.mockResolvedValue(undefined);
    mockBumpSuggestCacheVersion.mockReset();
    mockBumpSuggestCacheVersion.mockResolvedValue(undefined);
    mockBumpPostDetailCacheVersion.mockReset();
    mockBumpPostDetailCacheVersion.mockResolvedValue(undefined);
    mockBumpPostCommentsCacheVersion.mockReset();
    mockBumpPostCommentsCacheVersion.mockResolvedValue(undefined);
    mockBumpNotificationUnreadCacheVersion.mockReset();
    mockBumpNotificationUnreadCacheVersion.mockResolvedValue(undefined);
    mockBumpNotificationListCacheVersion.mockReset();
    mockBumpNotificationListCacheVersion.mockResolvedValue(undefined);
  });

  it("creates like reaction when no reaction exists", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      authorId: "owner-1",
      title: "강남 산책로 추천",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        postReaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          create,
          update: vi.fn(),
          delete: vi.fn(),
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { type: PostReactionType } }) =>
              where.type === PostReactionType.LIKE ? 1 : 0,
            ),
        },
        post: { update },
      } as never),
    );

    const result = await togglePostReaction({
      postId: "post-1",
      userId: "user-1",
      type: PostReactionType.LIKE,
    });

    expect(create).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { likeCount: 1, dislikeCount: 0 },
    });
    expect(result).toEqual({
      likeCount: 1,
      dislikeCount: 0,
      reaction: PostReactionType.LIKE,
      previousReaction: null,
    });
    expect(mockNotifyReactionOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "user-1",
      postId: "post-1",
      postTitle: "강남 산책로 추천",
      reactionType: PostReactionType.LIKE,
    });
  });

  it("notifies post author when dislike is newly applied", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-2",
      status: PostStatus.ACTIVE,
      authorId: "owner-2",
      title: "산책 코스 후기",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        postReaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          create,
          update: vi.fn(),
          delete: vi.fn(),
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { type: PostReactionType } }) =>
              where.type === PostReactionType.DISLIKE ? 1 : 0,
            ),
        },
        post: { update },
      } as never),
    );

    const result = await togglePostReaction({
      postId: "post-2",
      userId: "user-2",
      type: PostReactionType.DISLIKE,
    });

    expect(create).toHaveBeenCalled();
    expect(result).toEqual({
      likeCount: 0,
      dislikeCount: 1,
      reaction: PostReactionType.DISLIKE,
      previousReaction: null,
    });
    expect(mockNotifyReactionOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-2",
      actorId: "user-2",
      postId: "post-2",
      postTitle: "산책 코스 후기",
      reactionType: PostReactionType.DISLIKE,
    });
  });

  it("keeps reaction when requested state already exists", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const change = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      authorId: "owner-1",
      title: "우리동네 병원 후기",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        postReaction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "reaction-1",
            type: PostReactionType.DISLIKE,
          }),
          create: vi.fn(),
          update: change,
          delete: remove,
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { type: PostReactionType } }) =>
              where.type === PostReactionType.DISLIKE ? 1 : 0,
            ),
        },
        post: { update },
      } as never),
    );

    const result = await togglePostReaction({
      postId: "post-1",
      userId: "user-1",
      type: PostReactionType.DISLIKE,
    });

    expect(remove).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { likeCount: 0, dislikeCount: 1 },
    });
    expect(result).toEqual({
      likeCount: 0,
      dislikeCount: 1,
      reaction: PostReactionType.DISLIKE,
      previousReaction: PostReactionType.DISLIKE,
    });
    expect(mockNotifyReactionOnPost).not.toHaveBeenCalled();
  });

  it("clears reaction when desired state is null", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      authorId: "owner-1",
      title: "우리동네 병원 후기",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        postReaction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "reaction-1",
            type: PostReactionType.DISLIKE,
          }),
          create: vi.fn(),
          update: vi.fn(),
          delete: remove,
          count: vi.fn().mockResolvedValue(0),
        },
        post: { update },
      } as never),
    );

    const result = await togglePostReaction({
      postId: "post-1",
      userId: "user-1",
      type: null,
    });

    expect(remove).toHaveBeenCalledWith({
      where: { id: "reaction-1" },
    });
    expect(result).toEqual({
      likeCount: 0,
      dislikeCount: 0,
      reaction: null,
      previousReaction: PostReactionType.DISLIKE,
    });
  });

  it("falls back to raw SQL when reaction delegate is unavailable", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const executeRaw = vi.fn().mockResolvedValue(1);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      authorId: "owner-1",
      title: "주말 산책 후기",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: { update },
        $queryRaw: queryRaw,
        $executeRaw: executeRaw,
      } as never),
    );

    const result = await togglePostReaction({
      postId: "post-1",
      userId: "user-1",
      type: PostReactionType.LIKE,
    });

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { likeCount: 1, dislikeCount: 0 },
    });
    expect(result).toEqual({
      likeCount: 1,
      dislikeCount: 0,
      reaction: PostReactionType.LIKE,
      previousReaction: null,
    });
    expect(mockNotifyReactionOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "user-1",
      postId: "post-1",
      postTitle: "주말 산책 후기",
      reactionType: PostReactionType.LIKE,
    });
  });
});

describe("post bookmark toggle", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.postBookmark.findUnique.mockReset();
    mockPrisma.postBookmark.create.mockReset();
    mockPrisma.postBookmark.delete.mockReset();
    mockPrisma.userBlock.findFirst.mockReset();
    mockPrisma.userBlock.findFirst.mockResolvedValue(null);
    mockPrisma.userSanction.findFirst.mockReset();
    mockPrisma.userSanction.findFirst.mockResolvedValue(null);
  });

  it("creates bookmark when no bookmark exists", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      authorId: "owner-1",
    });
    mockPrisma.postBookmark.findUnique.mockResolvedValue(null);
    mockPrisma.postBookmark.create.mockResolvedValue({ id: "bookmark-1" });

    const result = await togglePostBookmark({
      postId: "post-1",
      userId: "user-1",
      bookmarked: true,
    });

    expect(mockPrisma.postBookmark.create).toHaveBeenCalledWith({
      data: {
        postId: "post-1",
        userId: "user-1",
      },
    });
    expect(result).toEqual({ bookmarked: true });
  });

  it("removes bookmark when it already exists", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-2",
      status: PostStatus.ACTIVE,
      authorId: "owner-2",
    });
    mockPrisma.postBookmark.findUnique.mockResolvedValue({ id: "bookmark-9" });
    mockPrisma.postBookmark.delete.mockResolvedValue({ id: "bookmark-9" });

    const result = await togglePostBookmark({
      postId: "post-2",
      userId: "user-2",
      bookmarked: false,
    });

    expect(mockPrisma.postBookmark.delete).toHaveBeenCalledWith({
      where: { id: "bookmark-9" },
    });
    expect(result).toEqual({ bookmarked: false });
  });

  it("keeps bookmark when requested state is already true", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-3",
      status: PostStatus.ACTIVE,
      authorId: "owner-3",
    });
    mockPrisma.postBookmark.findUnique.mockResolvedValue({ id: "bookmark-11" });

    const result = await togglePostBookmark({
      postId: "post-3",
      userId: "user-3",
      bookmarked: true,
    });

    expect(mockPrisma.postBookmark.create).not.toHaveBeenCalled();
    expect(mockPrisma.postBookmark.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ bookmarked: true });
  });
});

describe("deletePost", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.userSanction.findFirst.mockReset();
    mockPrisma.userSanction.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockReset();
  });

  it("soft-deletes comments and removes reactions/bookmarks while archiving notifications", async () => {
    const commentFindMany = vi.fn().mockResolvedValue([{ id: "comment-1" }, { id: "comment-2" }]);
    const notificationFindMany = vi
      .fn()
      .mockResolvedValue([{ userId: "user-2" }, { userId: "user-3" }, { userId: "user-2" }]);
    const commentReactionDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const commentUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const postReactionDeleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const postBookmarkDeleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const notificationUpdateMany = vi.fn().mockResolvedValue({ count: 3 });
    const postUpdate = vi.fn().mockResolvedValue({ id: "post-9", status: PostStatus.DELETED });

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-9",
      status: PostStatus.ACTIVE,
      authorId: "author-9",
      images: [],
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          findMany: commentFindMany,
          updateMany: commentUpdateMany,
        },
        commentReaction: {
          deleteMany: commentReactionDeleteMany,
        },
        postReaction: {
          deleteMany: postReactionDeleteMany,
        },
        postBookmark: {
          deleteMany: postBookmarkDeleteMany,
        },
        notification: {
          findMany: notificationFindMany,
          updateMany: notificationUpdateMany,
        },
        post: {
          update: postUpdate,
        },
      } as never),
    );

    const result = await deletePost({
      postId: "post-9",
      authorId: "author-9",
    });

    expect(commentFindMany).toHaveBeenCalledWith({
      where: { postId: "post-9" },
      select: { id: true },
    });
    expect(commentReactionDeleteMany).toHaveBeenCalledWith({
      where: { commentId: { in: ["comment-1", "comment-2"] } },
    });
    expect(commentUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["comment-1", "comment-2"] } },
      data: {
        status: PostStatus.DELETED,
        likeCount: 0,
        dislikeCount: 0,
      },
    });
    expect(postReactionDeleteMany).toHaveBeenCalledWith({
      where: { postId: "post-9" },
    });
    expect(postBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { postId: "post-9" },
    });
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        postId: "post-9",
        archivedAt: null,
      },
      data: {
        archivedAt: expect.any(Date),
      },
    });
    expect(postUpdate).toHaveBeenCalledWith({
      where: { id: "post-9" },
      data: {
        status: PostStatus.DELETED,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      },
      select: { id: true, status: true },
    });
    expect(result).toEqual({ id: "post-9", status: PostStatus.DELETED });
    expect(mockBumpFeedCacheVersion).toHaveBeenCalled();
    expect(mockBumpSearchCacheVersion).toHaveBeenCalled();
    expect(mockBumpSuggestCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostDetailCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostCommentsCacheVersion).toHaveBeenCalled();
    expect(mockBumpNotificationUnreadCacheVersion).toHaveBeenCalledWith("user-2");
    expect(mockBumpNotificationUnreadCacheVersion).toHaveBeenCalledWith("user-3");
    expect(mockBumpNotificationListCacheVersion).toHaveBeenCalledWith("user-2");
    expect(mockBumpNotificationListCacheVersion).toHaveBeenCalledWith("user-3");
  });

  it("rejects deleting another user's post", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-10",
      status: PostStatus.ACTIVE,
      authorId: "owner-10",
      images: [],
    });

    await expect(
      deletePost({
        postId: "post-10",
        authorId: "intruder-1",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });
});

describe("post view dedupe", () => {
  beforeEach(() => {
    mockPrisma.post.update.mockReset();
    mockPrisma.post.update.mockResolvedValue({ id: "post-1" });
  });

  it("increments once within dedupe window", async () => {
    const first = await registerPostView({
      postId: "post-dedupe-1",
      userId: "viewer-1",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      ttlSeconds: 600,
    });
    const second = await registerPostView({
      postId: "post-dedupe-1",
      userId: "viewer-1",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      ttlSeconds: 600,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(mockPrisma.post.update).toHaveBeenCalledTimes(1);
  });

  it("counts distinct viewers separately", async () => {
    const first = await registerPostView({
      postId: "post-dedupe-2",
      userId: "viewer-1",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      ttlSeconds: 600,
    });
    const second = await registerPostView({
      postId: "post-dedupe-2",
      userId: "viewer-2",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      ttlSeconds: 600,
    });

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(mockPrisma.post.update).toHaveBeenCalledTimes(2);
  });
});
