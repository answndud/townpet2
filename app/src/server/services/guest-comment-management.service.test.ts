import { createHash, scryptSync } from "crypto";

import { PostStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  deleteGuestComment,
  updateGuestComment,
} from "@/server/services/comment.service";

const {
  mockGetForbiddenKeywords,
  mockGetGuestPostPolicy,
  mockGetNewUserSafetyPolicy,
} = vi.hoisted(() => ({
  mockGetForbiddenKeywords: vi.fn(),
  mockGetGuestPostPolicy: vi.fn(),
  mockGetNewUserSafetyPolicy: vi.fn(),
}));

vi.mock("@/server/queries/policy.queries", () => ({
  getForbiddenKeywords: mockGetForbiddenKeywords,
  getGuestPostPolicy: mockGetGuestPostPolicy,
  getNewUserSafetyPolicy: mockGetNewUserSafetyPolicy,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    post: {
      update: vi.fn(),
    },
    guestViolation: {
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  comment: {
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  post: {
    update: ReturnType<typeof vi.fn>;
  };
  guestViolation: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function buildPasswordHash(rawPassword: string) {
  const salt = "testsalt1234567890";
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("guest comment management", () => {
  beforeEach(() => {
    mockPrisma.comment.findUnique.mockReset();
    mockPrisma.comment.count.mockReset();
    mockPrisma.comment.update.mockReset();
    mockPrisma.post.update.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.guestViolation.create.mockReset();
    mockPrisma.guestViolation.count.mockReset();

    mockGetForbiddenKeywords.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetNewUserSafetyPolicy.mockReset();

    mockGetForbiddenKeywords.mockResolvedValue([]);
    mockGetGuestPostPolicy.mockResolvedValue({ allowContact: true });
    mockGetNewUserSafetyPolicy.mockResolvedValue({
      contactBlockWindowHours: 24,
      minAccountAgeHours: 24,
      restrictedPostTypes: [],
    });
    mockPrisma.comment.count.mockResolvedValue(0);
    mockPrisma.guestViolation.create.mockResolvedValue({ id: "v1" });
    mockPrisma.guestViolation.count.mockResolvedValue(0);
  });

  it("updates guest comment with GuestAuthor credential when legacy hash is absent", async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: "comment-1",
      authorId: "guest-system-user",
      postId: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });
    mockPrisma.comment.update.mockResolvedValue({ id: "comment-1" });

    await expect(
      updateGuestComment({
        commentId: "comment-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
        input: {
          content: "수정된 댓글",
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.comment.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.guestViolation.create).not.toHaveBeenCalled();
  });

  it("rejects guest comment update with invalid password in GuestAuthor path", async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: "comment-1",
      authorId: "guest-system-user",
      postId: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });

    await expect(
      updateGuestComment({
        commentId: "comment-1",
        guestPassword: "9999",
        guestIdentity: {
          ip: "127.0.0.1",
        },
        input: {
          content: "수정 실패",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_GUEST_PASSWORD",
      status: 403,
    });

    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });

  it("deletes guest comment with GuestAuthor credential when legacy hash is absent", async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: "comment-1",
      authorId: "guest-system-user",
      postId: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          update: vi.fn().mockResolvedValue({ id: "comment-1", postId: "post-1" }),
        },
        post: {
          update: vi.fn().mockResolvedValue({ id: "post-1" }),
        },
      } as never),
    );

    await expect(
      deleteGuestComment({
        commentId: "comment-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
      }),
    ).resolves.toMatchObject({
      id: "comment-1",
      postId: "post-1",
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects guest comment update when GuestAuthor credential is missing", async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: "legacy-comment-1",
      authorId: "legacy-guest-user",
      postId: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: null,
      guestAuthor: null,
    });

    await expect(
      updateGuestComment({
        commentId: "legacy-comment-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
        input: {
          content: "legacy update",
        },
      }),
    ).rejects.toMatchObject({
      code: "GUEST_COMMENT_ONLY",
      status: 403,
    });

    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });
});
