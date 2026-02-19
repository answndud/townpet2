import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostReactionType, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyReactionOnPost } from "@/server/services/notification.service";
import {
  registerPostView,
  togglePostReaction,
} from "@/server/services/post.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notifyReactionOnPost: vi.fn().mockResolvedValue(null),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};
const mockNotifyReactionOnPost = vi.mocked(notifyReactionOnPost);

describe("post reaction toggle", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.post.update.mockReset();
    mockPrisma.$transaction.mockReset();
    mockNotifyReactionOnPost.mockReset();
    mockNotifyReactionOnPost.mockResolvedValue(null);
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
    });
    expect(mockNotifyReactionOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "user-1",
      postId: "post-1",
      postTitle: "강남 산책로 추천",
    });
  });

  it("removes reaction when clicking same type again", async () => {
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
      type: PostReactionType.DISLIKE,
    });

    expect(remove).toHaveBeenCalledWith({
      where: { id: "reaction-1" },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { likeCount: 0, dislikeCount: 0 },
    });
    expect(result).toEqual({
      likeCount: 0,
      dislikeCount: 0,
      reaction: null,
    });
    expect(mockNotifyReactionOnPost).not.toHaveBeenCalled();
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
    });
    expect(mockNotifyReactionOnPost).toHaveBeenCalledWith({
      recipientUserId: "owner-1",
      actorId: "user-1",
      postId: "post-1",
      postTitle: "주말 산책 후기",
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
