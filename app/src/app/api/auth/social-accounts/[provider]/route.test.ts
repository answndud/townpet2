import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/auth/social-accounts/[provider]/route";
import { auth } from "@/lib/auth";
import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { unlinkSocialAccountForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/services/auth.service", () => ({
  unlinkSocialAccountForUser: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockUnlinkSocialAccountForUser = vi.mocked(unlinkSocialAccountForUser);

describe("DELETE /api/auth/social-accounts/[provider]", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockRequireCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockUnlinkSocialAccountForUser.mockReset();
  });

  it("unlinks a provider for the current user", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        authProvider: "kakao",
      },
    } as never);
    mockUnlinkSocialAccountForUser.mockResolvedValue({
      provider: "kakao",
      sessionRevoked: true,
      remainingLoginMethods: {
        hasPassword: true,
        linkedAccountProviders: [],
      },
    });

    const request = new Request("http://localhost/api/auth/social-accounts/kakao", {
      method: "DELETE",
    }) as NextRequest;

    const response = await DELETE(request, {
      params: Promise.resolve({ provider: "kakao" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      data: {
        provider: "kakao",
        sessionRevoked: true,
        remainingLoginMethods: {
          hasPassword: true,
          linkedAccountProviders: [],
        },
      },
    });
    expect(mockUnlinkSocialAccountForUser).toHaveBeenCalledWith({
      userId: "user-1",
      authProvider: "kakao",
      input: {
        provider: "kakao",
      },
    });
  });

  it("returns service errors without monitoring them as unexpected failures", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        authProvider: "kakao",
      },
    } as never);
    mockUnlinkSocialAccountForUser.mockRejectedValue(
      new ServiceError(
        "마지막 로그인 수단은 해제할 수 없습니다.",
        "LAST_LOGIN_METHOD_REQUIRED",
        409,
      ),
    );

    const request = new Request("http://localhost/api/auth/social-accounts/kakao", {
      method: "DELETE",
    }) as NextRequest;

    const response = await DELETE(request, {
      params: Promise.resolve({ provider: "kakao" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "LAST_LOGIN_METHOD_REQUIRED",
      },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });
});
