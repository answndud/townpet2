import { PostScope, PostType, UserRole } from "@prisma/client";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { createPost } from "@/server/services/post.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  post: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("createPost new-user restriction", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.post.create.mockReset();
    mockPrisma.post.create.mockResolvedValue({
      id: "post-1",
      title: "테스트 글",
      content: "본문",
      type: PostType.FREE_POST,
      scope: PostScope.GLOBAL,
    });
  });

  it("blocks restricted post types for new users", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "마켓 테스트",
          content: "새 계정 제한 검증",
          type: PostType.MARKET_LISTING,
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "NEW_USER_RESTRICTED_TYPE",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("allows unrestricted categories even for new users", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "자유글 테스트",
          content: "작성 가능",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.create).toHaveBeenCalledTimes(1);
  });

  it("blocks new users when contact info is included in content", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "자유글",
          content: "문의는 010-1234-5678",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "CONTACT_RESTRICTED_FOR_NEW_USER",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("allows restricted categories for accounts older than 24 hours", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "실종 공지 테스트",
          content: "작성 가능",
          type: PostType.LOST_FOUND,
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.create).toHaveBeenCalledTimes(1);
  });
});
