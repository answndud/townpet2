import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/social-dev/link/route";
import { isSocialDevLoginEnabled } from "@/lib/env";
import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { linkSocialAccountForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/env", () => ({
  isSocialDevLoginEnabled: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/services/auth.service", () => ({
  linkSocialAccountForUser: vi.fn(),
}));

const mockIsSocialDevLoginEnabled = vi.mocked(isSocialDevLoginEnabled);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockLinkSocialAccountForUser = vi.mocked(linkSocialAccountForUser);

describe("POST /api/auth/social-dev/link", () => {
  beforeEach(() => {
    mockIsSocialDevLoginEnabled.mockReset();
    mockRequireCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockLinkSocialAccountForUser.mockReset();
  });

  it("links a social-dev provider for the current user", async () => {
    mockIsSocialDevLoginEnabled.mockReturnValue(true);
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockLinkSocialAccountForUser.mockResolvedValue({
      provider: "kakao",
      alreadyLinked: false,
    });

    const request = new Request("http://localhost/api/auth/social-dev/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "kakao" }),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      data: {
        provider: "kakao",
        alreadyLinked: false,
      },
    });
    expect(mockLinkSocialAccountForUser).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        provider: "kakao",
        providerAccountId: "social-dev:kakao:user-1",
      },
    });
  });

  it("returns a feature-disabled error when social-dev linking is off", async () => {
    mockIsSocialDevLoginEnabled.mockReturnValue(false);

    const request = new Request("http://localhost/api/auth/social-dev/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "kakao" }),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "FEATURE_DISABLED",
      },
    });
    expect(mockRequireCurrentUser).not.toHaveBeenCalled();
  });

  it("returns service errors without monitoring them as unexpected failures", async () => {
    mockIsSocialDevLoginEnabled.mockReturnValue(true);
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockLinkSocialAccountForUser.mockRejectedValue(
      new ServiceError("already linked", "PROVIDER_ALREADY_CONNECTED", 409),
    );

    const request = new Request("http://localhost/api/auth/social-dev/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "kakao" }),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_ALREADY_CONNECTED",
      },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });
});
