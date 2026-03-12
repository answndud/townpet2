import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { POST } from "@/app/api/admin/moderation/users/hide-content/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { hideDirectUserContent } from "@/server/services/direct-moderation.service";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/direct-moderation.service", () => ({
  hideDirectUserContent: vi.fn(),
}));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockHideDirectUserContent = vi.mocked(hideDirectUserContent);

describe("POST /api/admin/moderation/users/hide-content contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockHideDirectUserContent.mockReset();

    mockRequireModerator.mockResolvedValue({
      id: "mod-1",
      role: UserRole.ADMIN,
    } as never);
  });

  it("returns the hidden content counts", async () => {
    mockHideDirectUserContent.mockResolvedValue({
      targetUser: {
        id: "user-9",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
      scope: "LAST_24H",
      scopeLabel: "최근 24시간",
      hiddenPostCount: 2,
      hiddenCommentCount: 5,
    } as never);
    const request = new Request("http://localhost/api/admin/moderation/users/hide-content", {
      method: "POST",
      body: JSON.stringify({
        userKey: "user-9",
        reason: "링크 도배",
        scope: "LAST_24H",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        hiddenPostCount: 2,
        hiddenCommentCount: 5,
        scopeLabel: "최근 24시간",
      },
    });
    expect(mockHideDirectUserContent).toHaveBeenCalledWith({
      moderatorId: "mod-1",
      input: {
        userKey: "user-9",
        reason: "링크 도배",
        scope: "LAST_24H",
      },
    });
  });

  it("returns 500 and reports unexpected failures", async () => {
    mockHideDirectUserContent.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/admin/moderation/users/hide-content", {
      method: "POST",
      body: JSON.stringify({
        userKey: "user-9",
        reason: "링크 도배",
        scope: "LAST_24H",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
