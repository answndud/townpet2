import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostStatus, SanctionLevel, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  applyDirectUserSanction,
  hideDirectUserContent,
  restoreDirectUserContent,
  toggleDirectPostVisibility,
} from "@/server/services/direct-moderation.service";
import { createModerationActionLogs } from "@/server/moderation-action-log";
import { findUserByEmailInsensitive } from "@/server/queries/user.queries";
import { issueNextUserSanction } from "@/server/services/sanction.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    post: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/cache/query-cache", () => ({
  bumpFeedCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostCommentsCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostDetailCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSearchCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSuggestCacheVersion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/moderation-action-log", () => ({
  createModerationActionLogs: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  findUserByEmailInsensitive: vi.fn(),
}));

vi.mock("@/server/services/sanction.service", () => ({
  formatSanctionLevelLabel: vi.fn((level: SanctionLevel) => {
    switch (level) {
      case SanctionLevel.WARNING:
        return "경고";
      case SanctionLevel.SUSPEND_7D:
        return "7일 정지";
      case SanctionLevel.SUSPEND_30D:
        return "30일 정지";
      case SanctionLevel.PERMANENT_BAN:
        return "영구 정지";
      default:
        return level;
    }
  }),
  issueNextUserSanction: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  post: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};
const mockCreateModerationActionLogs = vi.mocked(createModerationActionLogs);
const mockFindUserByEmailInsensitive = vi.mocked(findUserByEmailInsensitive);
const mockIssueNextUserSanction = vi.mocked(issueNextUserSanction);

describe("direct moderation service", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockReset();
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockCreateModerationActionLogs.mockReset();
    mockFindUserByEmailInsensitive.mockReset();
    mockIssueNextUserSanction.mockReset();
    mockCreateModerationActionLogs.mockResolvedValue(undefined);
  });

  it("issues the next sanction level for a resolved email target", async () => {
    mockFindUserByEmailInsensitive.mockResolvedValue({
      id: "user-2",
      email: "spam@example.com",
      nickname: "spam-user",
      role: UserRole.USER,
    } as never);
    mockIssueNextUserSanction.mockResolvedValue({
      level: SanctionLevel.SUSPEND_7D,
    } as never);

    const result = await applyDirectUserSanction({
      moderatorId: "mod-1",
      input: {
        userKey: " spam@example.com ",
        reason: "도배성 스팸",
      },
    });

    expect(mockIssueNextUserSanction).toHaveBeenCalledWith({
      userId: "user-2",
      moderatorId: "mod-1",
      reason: "직접 모더레이션: 도배성 스팸",
    });
    expect(result).toMatchObject({
      targetUser: {
        id: "user-2",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
      sanctionLabel: "7일 정지",
    });
  });

  it("toggles a single post to hidden and records a moderation log", async () => {
    const updatePost = vi.fn().mockResolvedValue({});

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      title: "스팸 글",
      status: PostStatus.ACTIVE,
      authorId: "user-9",
      author: {
        id: "user-9",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          update: updatePost,
        },
        moderationActionLog: {},
      } as never),
    );

    const result = await toggleDirectPostVisibility({
      moderatorId: "mod-1",
      postId: "post-1",
      input: {
        action: "HIDE",
        reason: "같은 링크 반복",
      },
    });

    expect(updatePost).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { status: PostStatus.HIDDEN },
    });
    expect(mockCreateModerationActionLogs).toHaveBeenCalledWith({
      delegate: {},
      inputs: [
        expect.objectContaining({
          action: "TARGET_HIDDEN",
          targetType: "POST",
          targetId: "post-1",
          targetUserId: "user-9",
          metadata: expect.objectContaining({
            sourceAction: "DIRECT_POST_VISIBILITY_TOGGLE",
            reason: "같은 링크 반복",
            previousStatus: PostStatus.ACTIVE,
            nextStatus: PostStatus.HIDDEN,
          }),
        }),
      ],
    });
    expect(result).toMatchObject({
      changed: true,
      previousStatus: PostStatus.ACTIVE,
      post: {
        id: "post-1",
        status: PostStatus.HIDDEN,
      },
      targetUser: {
        id: "user-9",
        email: "spam@example.com",
      },
    });
  });

  it("rejects direct moderation for moderator targets", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "mod-2",
      email: "mod@example.com",
      nickname: "moderator",
      role: UserRole.MODERATOR,
    });

    await expect(
      applyDirectUserSanction({
        moderatorId: "mod-1",
        input: {
          userKey: "mod-2",
          reason: "테스트",
        },
      }),
    ).rejects.toMatchObject({
      code: "DIRECT_MODERATION_USER_ONLY",
      status: 403,
    });
    expect(mockIssueNextUserSanction).not.toHaveBeenCalled();
  });

  it("hides active posts and comments for the selected scope", async () => {
    const updatePosts = vi.fn().mockResolvedValue({ count: 2 });
    const updateComments = vi.fn().mockResolvedValue({ count: 1 });
    const updatePostCommentCount = vi.fn().mockResolvedValue({});
    const findTargetComments = vi
      .fn()
      .mockResolvedValueOnce([{ id: "comment-1", postId: "post-3" }])
      .mockResolvedValueOnce([{ postId: "post-3" }]);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-9",
      email: "spam@example.com",
      nickname: "spam-user",
      role: UserRole.USER,
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findMany: vi.fn().mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]),
          updateMany: updatePosts,
          update: updatePostCommentCount,
        },
        comment: {
          findMany: findTargetComments,
          updateMany: updateComments,
        },
        moderationActionLog: {},
      } as never),
    );

    const result = await hideDirectUserContent({
      moderatorId: "mod-1",
      input: {
        userKey: "user-9",
        reason: "동일 링크 반복",
        scope: "LAST_7D",
      },
    });

    expect(updatePosts).toHaveBeenCalledWith({
      where: { id: { in: ["post-1", "post-2"] } },
      data: { status: PostStatus.HIDDEN },
    });
    expect(updateComments).toHaveBeenCalledWith({
      where: { id: { in: ["comment-1"] } },
      data: { status: PostStatus.DELETED },
    });
    expect(updatePostCommentCount).toHaveBeenCalledWith({
      where: { id: "post-3" },
      data: { commentCount: 1 },
    });
    expect(mockCreateModerationActionLogs).toHaveBeenCalledWith({
      delegate: {},
      inputs: [
        expect.objectContaining({
          action: "TARGET_HIDDEN",
          targetType: "POST",
          targetId: "post-1",
          targetUserId: "user-9",
        }),
        expect.objectContaining({
          action: "TARGET_HIDDEN",
          targetType: "POST",
          targetId: "post-2",
          targetUserId: "user-9",
        }),
        expect.objectContaining({
          action: "TARGET_HIDDEN",
          targetType: "COMMENT",
          targetId: "comment-1",
          targetUserId: "user-9",
          metadata: expect.objectContaining({
            sourceAction: "DIRECT_HIDE_USER_CONTENT",
            scope: "LAST_7D",
            postId: "post-3",
          }),
        }),
      ],
    });
    expect(result).toMatchObject({
      hiddenPostCount: 2,
      hiddenCommentCount: 1,
      scope: "LAST_7D",
      scopeLabel: "최근 7일",
    });
  });

  it("restores only content whose latest moderation state is direct hide", async () => {
    const updatePosts = vi.fn().mockResolvedValue({ count: 1 });
    const updateComments = vi.fn().mockResolvedValue({ count: 1 });
    const updatePostCommentCount = vi.fn().mockResolvedValue({});
    const findComments = vi
      .fn()
      .mockResolvedValueOnce([{ id: "comment-1", postId: "post-9" }, { id: "comment-2", postId: "post-9" }])
      .mockResolvedValueOnce([{ postId: "post-9" }, { postId: "post-9" }]);
    const findModerationLogs = vi.fn().mockImplementation(async ({ where }) => {
      if (where.targetType === "POST") {
        return [
          {
            targetId: "post-1",
            action: "TARGET_HIDDEN",
            metadata: { sourceAction: "DIRECT_HIDE_USER_CONTENT" },
          },
          {
            targetId: "post-2",
            action: "TARGET_HIDDEN",
            metadata: { sourceAction: "HIDE_TARGET" },
          },
        ];
      }

      return [
        {
          targetId: "comment-1",
          action: "TARGET_HIDDEN",
          metadata: { sourceAction: "DIRECT_HIDE_USER_CONTENT" },
        },
        {
          targetId: "comment-2",
          action: "TARGET_UNHIDDEN",
          metadata: { sourceAction: "DIRECT_RESTORE_USER_CONTENT" },
        },
      ];
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-9",
      email: "spam@example.com",
      nickname: "spam-user",
      role: UserRole.USER,
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findMany: vi.fn().mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]),
          updateMany: updatePosts,
          update: updatePostCommentCount,
        },
        comment: {
          findMany: findComments,
          updateMany: updateComments,
        },
        moderationActionLog: {
          findMany: findModerationLogs,
        },
      } as never),
    );

    const result = await restoreDirectUserContent({
      moderatorId: "mod-1",
      input: {
        userKey: "user-9",
        reason: "오탐 복구",
        scope: "ALL_ACTIVE",
      },
    });

    expect(updatePosts).toHaveBeenCalledWith({
      where: { id: { in: ["post-1"] } },
      data: { status: PostStatus.ACTIVE },
    });
    expect(updateComments).toHaveBeenCalledWith({
      where: { id: { in: ["comment-1"] } },
      data: { status: PostStatus.ACTIVE },
    });
    expect(updatePostCommentCount).toHaveBeenCalledWith({
      where: { id: "post-9" },
      data: { commentCount: 2 },
    });
    expect(mockCreateModerationActionLogs).toHaveBeenCalledWith({
      delegate: { findMany: findModerationLogs },
      inputs: [
        expect.objectContaining({
          action: "TARGET_UNHIDDEN",
          targetType: "POST",
          targetId: "post-1",
          metadata: expect.objectContaining({
            sourceAction: "DIRECT_RESTORE_USER_CONTENT",
            restoredFrom: "DIRECT_HIDE_USER_CONTENT",
          }),
        }),
        expect.objectContaining({
          action: "TARGET_UNHIDDEN",
          targetType: "COMMENT",
          targetId: "comment-1",
          metadata: expect.objectContaining({
            sourceAction: "DIRECT_RESTORE_USER_CONTENT",
            restoredFrom: "DIRECT_HIDE_USER_CONTENT",
            postId: "post-9",
          }),
        }),
      ],
    });
    expect(result).toMatchObject({
      restoredPostCount: 1,
      restoredCommentCount: 1,
      scopeLabel: "전체 범위",
    });
  });
});
