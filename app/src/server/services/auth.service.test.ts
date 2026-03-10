import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  confirmPasswordReset,
  invalidateUserSessions,
  setPasswordForUser,
} from "@/server/services/auth.service";
import { hashPassword, hashToken, verifyPassword } from "@/server/password";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/password", () => ({
  hashPassword: vi.fn(),
  hashToken: vi.fn(),
  verifyPassword: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  passwordResetToken: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockHashPassword = vi.mocked(hashPassword);
const mockHashToken = vi.mocked(hashToken);
const mockVerifyPassword = vi.mocked(verifyPassword);

describe("auth service session invalidation", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.passwordResetToken.findFirst.mockReset();
    mockPrisma.$transaction.mockReset();
    mockHashPassword.mockReset();
    mockHashToken.mockReset();
    mockVerifyPassword.mockReset();

    mockHashPassword.mockResolvedValue("salt:hash");
    mockHashToken.mockReturnValue("token-hash");
    mockVerifyPassword.mockResolvedValue(true);
  });

  it("increments session version when changing an existing password", async () => {
    const updateUser = vi.fn().mockResolvedValue(undefined);

    mockPrisma.user.findUnique.mockResolvedValue({
      passwordHash: "stored-hash",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: { update: updateUser },
        authAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
      } as never),
    );

    await setPasswordForUser({
      userId: "user-1",
      input: {
        currentPassword: "OldPassword1!",
        password: "NewPassword1!",
      },
    });

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "salt:hash",
        sessionVersion: { increment: 1 },
      },
    });
  });

  it("does not increment session version for first-time password setup", async () => {
    const updateUser = vi.fn().mockResolvedValue(undefined);

    mockPrisma.user.findUnique.mockResolvedValue({
      passwordHash: null,
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: { update: updateUser },
        authAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
      } as never),
    );

    await setPasswordForUser({
      userId: "user-1",
      input: {
        password: "NewPassword1!",
      },
    });

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "salt:hash",
      },
    });
  });

  it("increments session version on password reset confirmation", async () => {
    const updateUser = vi.fn().mockResolvedValue(undefined);
    const updateResetToken = vi.fn().mockResolvedValue(undefined);
    const deleteResetTokens = vi.fn().mockResolvedValue(undefined);
    const createAuditLog = vi.fn().mockResolvedValue(undefined);

    mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
    });
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: { update: updateUser },
        passwordResetToken: {
          update: updateResetToken,
          deleteMany: deleteResetTokens,
        },
        authAuditLog: { create: createAuditLog },
      } as never),
    );

    await confirmPasswordReset({
      input: {
        token: "reset-token-value-reset-token-value",
        password: "ResetPassword1!",
      },
    });

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "salt:hash",
        sessionVersion: { increment: 1 },
      },
    });
    expect(updateResetToken).toHaveBeenCalled();
    expect(deleteResetTokens).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalled();
  });

  it("increments session version when revoking active sessions", async () => {
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await invalidateUserSessions({ userId: "user-1" });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        sessionVersion: { increment: 1 },
      },
      select: { id: true },
    });
  });
});
