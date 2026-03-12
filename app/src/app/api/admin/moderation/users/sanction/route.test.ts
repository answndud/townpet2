import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { POST } from "@/app/api/admin/moderation/users/sanction/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { applyDirectUserSanction } from "@/server/services/direct-moderation.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/direct-moderation.service", () => ({
  applyDirectUserSanction: vi.fn(),
}));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockApplyDirectUserSanction = vi.mocked(applyDirectUserSanction);

describe("POST /api/admin/moderation/users/sanction contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockApplyDirectUserSanction.mockReset();

    mockRequireModerator.mockResolvedValue({
      id: "mod-1",
      role: UserRole.MODERATOR,
    } as never);
  });

  it("returns the direct sanction result", async () => {
    mockApplyDirectUserSanction.mockResolvedValue({
      targetUser: {
        id: "user-9",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
      sanctionLevel: "WARNING",
      sanctionLabel: "경고",
    } as never);
    const request = new Request("http://localhost/api/admin/moderation/users/sanction", {
      method: "POST",
      body: JSON.stringify({
        userKey: "spam@example.com",
        reason: "도배",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        sanctionLabel: "경고",
        targetUser: {
          id: "user-9",
        },
      },
    });
    expect(mockApplyDirectUserSanction).toHaveBeenCalledWith({
      moderatorId: "mod-1",
      input: {
        userKey: "spam@example.com",
        reason: "도배",
      },
    });
  });

  it("maps service errors", async () => {
    mockApplyDirectUserSanction.mockRejectedValue(
      new ServiceError("no user", "USER_NOT_FOUND", 404),
    );
    const request = new Request("http://localhost/api/admin/moderation/users/sanction", {
      method: "POST",
      body: JSON.stringify({
        userKey: "missing@example.com",
        reason: "도배",
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
