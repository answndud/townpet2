import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  linkSocialAccountForUser,
  unlinkSocialAccountForUser,
} from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findFirst: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  account: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("linkSocialAccountForUser", () => {
  beforeEach(() => {
    mockPrisma.account.findFirst.mockReset();
    mockPrisma.account.findUnique.mockReset();
    mockPrisma.account.create.mockReset();
    mockPrisma.account.delete.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        account: {
          delete: mockPrisma.account.delete,
        },
        user: {
          update: mockPrisma.user.update,
        },
      }),
    );
  });

  it("creates a provider account when the provider is not linked yet", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    mockPrisma.account.findUnique.mockResolvedValue(null);
    mockPrisma.account.create.mockResolvedValue({ id: "account-1" });

    const result = await linkSocialAccountForUser({
      userId: "user-1",
      input: {
        provider: "kakao",
        providerAccountId: "social-dev:kakao:user-1",
      },
    });

    expect(result).toEqual({
      provider: "kakao",
      alreadyLinked: false,
    });
    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "oauth",
        provider: "kakao",
        providerAccountId: "social-dev:kakao:user-1",
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects when another account from the same provider is already linked", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      providerAccountId: "existing-kakao-account",
    });

    await expect(
      linkSocialAccountForUser({
        userId: "user-1",
        input: {
          provider: "kakao",
          providerAccountId: "different-kakao-account",
        },
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ALREADY_CONNECTED",
      status: 409,
    } satisfies Partial<ServiceError>);
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("blocks unlinking the last remaining login method", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: null,
      accounts: [{ id: "account-1", provider: "kakao" }],
    });

    await expect(
      unlinkSocialAccountForUser({
        userId: "user-1",
        authProvider: "kakao",
        input: {
          provider: "kakao",
        },
      }),
    ).rejects.toMatchObject({
      code: "LAST_LOGIN_METHOD_REQUIRED",
      status: 409,
    } satisfies Partial<ServiceError>);

    expect(mockPrisma.account.delete).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("revokes the current session when unlinking the active provider", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed-password",
      accounts: [{ id: "account-1", provider: "kakao" }],
    });
    mockPrisma.account.delete.mockResolvedValue({ id: "account-1" });
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    const result = await unlinkSocialAccountForUser({
      userId: "user-1",
      authProvider: "kakao",
      input: {
        provider: "kakao",
      },
    });

    expect(result).toEqual({
      provider: "kakao",
      sessionRevoked: true,
      remainingLoginMethods: {
        hasPassword: true,
        linkedAccountProviders: [],
      },
    });
    expect(mockPrisma.account.delete).toHaveBeenCalledWith({
      where: {
        id: "account-1",
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        sessionVersion: { increment: 1 },
      },
    });
  });
});
