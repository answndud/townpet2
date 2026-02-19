import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostReactionType, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { togglePostReaction } from "@/server/services/post.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("post reaction toggle", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  it("creates like reaction when no reaction exists", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        postReaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          create,
          update: vi.fn(),
          delete: vi.fn(),
          groupBy: vi.fn().mockResolvedValue([
            { type: PostReactionType.LIKE, _count: { _all: 1 } },
          ]),
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
  });

  it("removes reaction when clicking same type again", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
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
          groupBy: vi.fn().mockResolvedValue([]),
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
  });
});
