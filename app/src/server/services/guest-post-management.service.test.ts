import { createHash, scryptSync } from "crypto";

import { PostScope, PostStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  deleteGuestPost,
  updateGuestPost,
} from "@/server/services/post.service";

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
    post: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    guestBan: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    guestViolation: {
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  guestBan: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
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

describe("guest post management", () => {
  beforeEach(() => {
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.post.update.mockReset();
    mockPrisma.guestBan.findFirst.mockReset();
    mockPrisma.guestBan.findFirst.mockResolvedValue(null);
    mockPrisma.guestBan.create.mockReset();
    mockPrisma.guestViolation.create.mockReset();
    mockPrisma.guestViolation.count.mockReset();
    mockPrisma.$transaction.mockReset();

    mockGetForbiddenKeywords.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetNewUserSafetyPolicy.mockReset();

    mockGetForbiddenKeywords.mockResolvedValue([]);
    mockGetGuestPostPolicy.mockResolvedValue({
      blockedPostTypes: [],
      maxImageCount: 1,
      allowLinks: false,
      allowContact: false,
      enforceGlobalScope: true,
    });
    mockGetNewUserSafetyPolicy.mockResolvedValue({
      minAccountAgeHours: 24,
      restrictedPostTypes: [],
      contactBlockWindowHours: 24,
    });

    mockPrisma.guestViolation.create.mockResolvedValue({ id: "v1" });
    mockPrisma.guestViolation.count.mockResolvedValue(0);
  });

  it("updates guest post when password and identity are valid", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: sha256("guest-fp-1"),
      },
    });
    mockPrisma.post.update.mockResolvedValue({ id: "post-1" });

    await expect(
      updateGuestPost({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
          fingerprint: "guest-fp-1",
        },
        input: {
          title: "수정 제목",
          content: "링크 없는 수정 본문",
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.update).toHaveBeenCalledTimes(1);
  });

  it("rejects guest update with invalid password", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });

    await expect(
      updateGuestPost({
        postId: "post-1",
        guestPassword: "9999",
        guestIdentity: {
          ip: "127.0.0.1",
        },
        input: {
          title: "수정 제목",
          content: "수정 본문",
          scope: PostScope.GLOBAL,
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_GUEST_PASSWORD",
      status: 403,
    });

    expect(mockPrisma.guestViolation.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.post.update).not.toHaveBeenCalled();
  });

  it("rejects guest delete when identity does not match", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });

    await expect(
      deleteGuestPost({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "10.0.0.1",
        },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });

    expect(mockPrisma.guestViolation.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.post.update).not.toHaveBeenCalled();
  });

  it("deletes guest post when password and identity are valid", async () => {
    const postUpdate = vi.fn().mockResolvedValue({
      id: "post-1",
      status: PostStatus.DELETED,
    });
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      images: [],
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        commentReaction: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        postReaction: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        postBookmark: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        post: {
          update: postUpdate,
        },
      } as never),
    );

    await expect(
      deleteGuestPost({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
      }),
    ).resolves.toMatchObject({
      id: "post-1",
      status: PostStatus.DELETED,
    });

    expect(postUpdate).toHaveBeenCalledTimes(1);
  });

  it("updates guest post using GuestAuthor credential when legacy hash is absent", async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
      guestPasswordHash: null,
      guestIpHash: null,
      guestFingerprintHash: null,
    });
    mockPrisma.post.update.mockResolvedValue({ id: "post-1" });

    await expect(
      updateGuestPost({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
        input: {
          title: "GuestAuthor 수정",
          content: "GuestAuthor credential",
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.update).toHaveBeenCalledTimes(1);
  });

  it("deletes guest post using GuestAuthor credential when legacy hash is absent", async () => {
    const postUpdate = vi.fn().mockResolvedValue({
      id: "post-1",
      status: PostStatus.DELETED,
    });
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: PostStatus.ACTIVE,
      guestAuthorId: "guest-author-1",
      images: [],
      guestAuthor: {
        passwordHash: buildPasswordHash("1234"),
        ipHash: sha256("127.0.0.1"),
        fingerprintHash: null,
      },
      guestPasswordHash: null,
      guestIpHash: null,
      guestFingerprintHash: null,
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        comment: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        commentReaction: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        postReaction: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        postBookmark: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        post: {
          update: postUpdate,
        },
      } as never),
    );

    await expect(
      deleteGuestPost({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: {
          ip: "127.0.0.1",
        },
      }),
    ).resolves.toMatchObject({
      id: "post-1",
      status: PostStatus.DELETED,
    });

    expect(postUpdate).toHaveBeenCalledTimes(1);
  });
});
