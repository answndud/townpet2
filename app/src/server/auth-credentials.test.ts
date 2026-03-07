import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { authorizeCredentialsLogin, resolveFailedLoginDelayMs } from "@/server/auth-credentials";
import { recordAuthAuditEvent } from "@/server/auth-audit-log";
import { verifyPassword } from "@/server/password";
import {
  clearRateLimitKeys,
  enforceRateLimitAndReturnState,
} from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/auth-audit-log", () => ({
  recordAuthAuditEvent: vi.fn(),
}));

vi.mock("@/server/password", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimitAndReturnState: vi.fn(),
  clearRateLimitKeys: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockRecordAuthAuditEvent = vi.mocked(recordAuthAuditEvent);
const mockEnforceRateLimitAndReturnState = vi.mocked(enforceRateLimitAndReturnState);
const mockClearRateLimitKeys = vi.mocked(clearRateLimitKeys);

describe("authorizeCredentialsLogin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPrisma.user.findUnique.mockReset();
    mockVerifyPassword.mockReset();
    mockRecordAuthAuditEvent.mockReset();
    mockEnforceRateLimitAndReturnState.mockReset();
    mockClearRateLimitKeys.mockReset();

    mockRecordAuthAuditEvent.mockResolvedValue(undefined);
    mockClearRateLimitKeys.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records rate-limited login attempts", async () => {
    mockEnforceRateLimitAndReturnState.mockRejectedValue(
      new ServiceError("slow down", "RATE_LIMITED", 429),
    );

    const result = await authorizeCredentialsLogin(
      {
        email: "user@test.dev",
        password: "Password1!",
      },
      {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "Vitest",
        }),
      },
    );

    expect(result).toBeNull();
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_RATE_LIMITED",
        email: "user@test.dev",
        ipAddress: "203.0.113.10",
        reasonCode: "RATE_LIMITED",
      }),
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("records invalid password failures and applies stepped delay", async () => {
    mockEnforceRateLimitAndReturnState
      .mockResolvedValueOnce({ count: 1, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 3, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 3, resetAt: Date.now() + 60_000 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.dev",
      nickname: "tester",
      image: null,
      passwordHash: "stored-hash",
      emailVerified: new Date("2026-03-01T00:00:00.000Z"),
      sessionVersion: 2,
    });
    mockVerifyPassword.mockResolvedValue(false);

    const loginPromise = authorizeCredentialsLogin(
      {
        email: "user@test.dev",
        password: "WrongPassword1!",
      },
      {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.11",
          "user-agent": "Vitest",
        }),
      },
    );

    await vi.advanceTimersByTimeAsync(resolveFailedLoginDelayMs(3));
    const result = await loginPromise;

    expect(result).toBeNull();
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_FAILURE",
        userId: "user-1",
        email: "user@test.dev",
        reasonCode: "INVALID_PASSWORD",
      }),
    );
    expect(mockClearRateLimitKeys).not.toHaveBeenCalled();
  });

  it("records invalid input without hitting the database", async () => {
    mockEnforceRateLimitAndReturnState
      .mockResolvedValueOnce({ count: 1, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 4, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 4, resetAt: Date.now() + 60_000 });

    const loginPromise = authorizeCredentialsLogin(
      {
        email: "not-an-email",
        password: "",
      },
      {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.12",
        }),
      },
    );

    await vi.advanceTimersByTimeAsync(resolveFailedLoginDelayMs(4));
    const result = await loginPromise;

    expect(result).toBeNull();
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_FAILURE",
        email: "not-an-email",
        reasonCode: "INVALID_INPUT",
      }),
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("records successful login and clears account-scoped counters", async () => {
    mockEnforceRateLimitAndReturnState
      .mockResolvedValueOnce({ count: 1, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 2, resetAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ count: 2, resetAt: Date.now() + 60_000 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@test.dev",
      nickname: "tester",
      image: null,
      passwordHash: "stored-hash",
      emailVerified: new Date("2026-03-01T00:00:00.000Z"),
      sessionVersion: 4,
    });
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authorizeCredentialsLogin(
      {
        email: "user@test.dev",
        password: "Password1!",
      },
      {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.13",
          "user-agent": "Vitest",
        }),
      },
    );

    expect(result).toMatchObject({
      id: "user-1",
      email: "user@test.dev",
      sessionVersion: 4,
    });
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_SUCCESS",
        userId: "user-1",
      }),
    );
    expect(mockClearRateLimitKeys).toHaveBeenCalledWith([
      expect.stringContaining("auth:login:account-ip:"),
      expect.stringContaining("auth:login:account:"),
    ]);
  });
});
