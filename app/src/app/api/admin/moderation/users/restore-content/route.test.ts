import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { POST } from "@/app/api/admin/moderation/users/restore-content/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { restoreDirectUserContent } from "@/server/services/direct-moderation.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/direct-moderation.service", () => ({
  restoreDirectUserContent: vi.fn(),
}));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockRestoreDirectUserContent = vi.mocked(restoreDirectUserContent);

describe("POST /api/admin/moderation/users/restore-content contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockRestoreDirectUserContent.mockReset();

    mockRequireModerator.mockResolvedValue({
      id: "mod-1",
      role: UserRole.ADMIN,
    } as never);
  });

  it("returns restored direct moderation counts", async () => {
    mockRestoreDirectUserContent.mockResolvedValue({
      targetUser: {
        id: "user-9",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
      scope: "ALL_ACTIVE",
      scopeLabel: "전체 범위",
      restoredPostCount: 1,
      restoredCommentCount: 2,
    } as never);
    const request = new Request("http://localhost/api/admin/moderation/users/restore-content", {
      method: "POST",
      body: JSON.stringify({
        userKey: "user-9",
        reason: "오탐 복구",
        scope: "ALL_ACTIVE",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        restoredPostCount: 1,
        restoredCommentCount: 2,
        scopeLabel: "전체 범위",
      },
    });
    expect(mockRestoreDirectUserContent).toHaveBeenCalledWith({
      moderatorId: "mod-1",
      input: {
        userKey: "user-9",
        reason: "오탐 복구",
        scope: "ALL_ACTIVE",
      },
    });
  });

  it("maps service errors", async () => {
    mockRestoreDirectUserContent.mockRejectedValue(
      new ServiceError("missing", "USER_NOT_FOUND", 404),
    );
    const request = new Request("http://localhost/api/admin/moderation/users/restore-content", {
      method: "POST",
      body: JSON.stringify({
        userKey: "user-404",
        reason: "오탐 복구",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "USER_NOT_FOUND" },
    });
  });
});
