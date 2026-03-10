import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { linkSocialAccountForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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
  };
};

describe("linkSocialAccountForUser", () => {
  beforeEach(() => {
    mockPrisma.account.findFirst.mockReset();
    mockPrisma.account.findUnique.mockReset();
    mockPrisma.account.create.mockReset();
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
});
