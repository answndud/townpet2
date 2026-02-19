import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentReactionType, PostStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  notifyCommentOnPost,
  notifyReplyToComment,
} from "@/server/services/notification.service";
import { createComment, toggleCommentReaction } from "@/server/services/comment.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notifyCommentOnPost: vi.fn().mockResolvedValue(null),
  notifyReplyToComment: vi.fn().mockResolvedValue(null),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockNotifyCommentOnPost = vi.mocked(notifyCommentOnPost);
const mockNotifyReplyToComment = vi.mocked(notifyReplyToComment);

describe("comment service notification flow", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.$transaction.mockReset();
    mockNotifyCommentOnPost.mockReset();
    mockNotifyReplyToComment.mockReset();
    mockNotifyCommentOnPost.mockResolvedValue(null);
    mockNotifyReplyToComment.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: UserRole.USER,
      createdAt: new Date("2026-02-16T00:00:00.000Z"),
    });
  });

  it("notifies post author on new top-level comment", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findUnique: vi.fn().mockResolvedValue({
            id: "post-1",
            status: PostStatus.ACTIVE,
            authorId: "owner-1",
            title: "강남 산책로 추천",
          }),
          update: vi.fn().mockResolvedValue({ id: "post-1" }),
        },
        comment: {
          findUnique: vi.fn(),
          create: vi.fn().mockResolvedValue({
            id: "comment-1",
            content: "좋은 정보 감사합니다",
          }),
        },
      } as never),
    );

    const result = await createComment({
      authorId: "actor-1",
      postId: "post-1",
      input: { content: "좋은 정보 감사합니다" },
    });

    expect(result.id).toBe("comment-1");
    expect(mockNotifyCommentOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-1",
      commentId: "comment-1",
      postTitle: "강남 산책로 추천",
      commentContent: "좋은 정보 감사합니다",
    });
    expect(mockNotifyReplyToComment).not.toHaveBeenCalled();
  });

  it("notifies both post author and parent comment author on reply", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findUnique: vi.fn().mockResolvedValue({
            id: "post-2",
            status: PostStatus.ACTIVE,
            authorId: "owner-1",
            title: "우리동네 병원 후기",
          }),
          update: vi.fn().mockResolvedValue({ id: "post-2" }),
        },
        comment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "parent-1",
            postId: "post-2",
            status: PostStatus.ACTIVE,
            authorId: "parent-1",
          }),
          create: vi.fn().mockResolvedValue({
            id: "reply-1",
            content: "답글 남깁니다",
          }),
        },
      } as never),
    );

    await createComment({
      authorId: "actor-1",
      postId: "post-2",
      parentId: "parent-1",
      input: { content: "답글 남깁니다" },
    });

    expect(mockNotifyCommentOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-2",
      commentId: "reply-1",
      postTitle: "우리동네 병원 후기",
      commentContent: "답글 남깁니다",
    });

    expect(mockNotifyReplyToComment).toHaveBeenCalledWith({
      recipientUserId: "parent-1",
      actorId: "actor-1",
      postId: "post-2",
      commentId: "reply-1",
      postTitle: "우리동네 병원 후기",
      replyContent: "답글 남깁니다",
    });
  });

  it("skips reply notification when user replies to own comment", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findUnique: vi.fn().mockResolvedValue({
            id: "post-3",
            status: PostStatus.ACTIVE,
            authorId: "owner-1",
            title: "서울숲 산책 코스",
          }),
          update: vi.fn().mockResolvedValue({ id: "post-3" }),
        },
        comment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "parent-2",
            postId: "post-3",
            status: PostStatus.ACTIVE,
            authorId: "actor-1",
          }),
          create: vi.fn().mockResolvedValue({
            id: "reply-2",
            content: "셀프 답글",
          }),
        },
      } as never),
    );

    await createComment({
      authorId: "actor-1",
      postId: "post-3",
      parentId: "parent-2",
      input: { content: "셀프 답글" },
    });

    expect(mockNotifyCommentOnPost).toHaveBeenCalledTimes(1);
    expect(mockNotifyReplyToComment).not.toHaveBeenCalled();
  });

  it("toggles off existing same reaction", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "comment-10",
            status: PostStatus.ACTIVE,
          }),
          update: vi.fn().mockResolvedValue({
            id: "comment-10",
            likeCount: 0,
            dislikeCount: 0,
          }),
        },
        commentReaction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "reaction-10",
            type: CommentReactionType.LIKE,
          }),
          delete: vi.fn().mockResolvedValue({ id: "reaction-10" }),
          update: vi.fn(),
          create: vi.fn(),
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { type: CommentReactionType } }) =>
              where.type === CommentReactionType.LIKE ? 0 : 0,
            ),
        },
      } as never),
    );

    const result = await toggleCommentReaction({
      commentId: "comment-10",
      userId: "user-10",
      type: CommentReactionType.LIKE,
    });

    expect(result).toEqual({
      commentId: "comment-10",
      reaction: null,
      likeCount: 0,
      dislikeCount: 0,
    });
  });

  it("switches reaction from dislike to like", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "comment-20",
            status: PostStatus.ACTIVE,
          }),
          update: vi.fn().mockResolvedValue({
            id: "comment-20",
            likeCount: 3,
            dislikeCount: 1,
          }),
        },
        commentReaction: {
          findUnique: vi.fn().mockResolvedValue({
            id: "reaction-20",
            type: CommentReactionType.DISLIKE,
          }),
          delete: vi.fn(),
          update: vi.fn().mockResolvedValue({
            id: "reaction-20",
            type: CommentReactionType.LIKE,
          }),
          create: vi.fn(),
          count: vi
            .fn()
            .mockImplementation(({ where }: { where: { type: CommentReactionType } }) =>
              where.type === CommentReactionType.LIKE ? 3 : 1,
            ),
        },
      } as never),
    );

    const result = await toggleCommentReaction({
      commentId: "comment-20",
      userId: "user-20",
      type: CommentReactionType.LIKE,
    });

    expect(result).toEqual({
      commentId: "comment-20",
      reaction: CommentReactionType.LIKE,
      likeCount: 3,
      dislikeCount: 1,
    });
  });

  it("blocks new user comment when contact info is included", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: UserRole.USER,
      createdAt: new Date("2026-02-19T10:00:00.000Z"),
    });

    await expect(
      createComment({
        authorId: "actor-1",
        postId: "post-1",
        input: { content: "카톡 아이디: townpet123" },
      }),
    ).rejects.toMatchObject({
      code: "CONTACT_RESTRICTED_FOR_NEW_USER",
      status: 403,
    });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
