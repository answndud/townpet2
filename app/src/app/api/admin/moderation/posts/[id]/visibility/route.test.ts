import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostStatus, UserRole } from "@prisma/client";

import { PATCH } from "@/app/api/admin/moderation/posts/[id]/visibility/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { toggleDirectPostVisibility } from "@/server/services/direct-moderation.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/direct-moderation.service", () => ({
  toggleDirectPostVisibility: vi.fn(),
}));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockToggleDirectPostVisibility = vi.mocked(toggleDirectPostVisibility);

describe("PATCH /api/admin/moderation/posts/[id]/visibility contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockToggleDirectPostVisibility.mockReset();

    mockRequireModerator.mockResolvedValue({
      id: "mod-1",
      role: UserRole.ADMIN,
    } as never);
  });

  it("returns the updated post visibility state", async () => {
    mockToggleDirectPostVisibility.mockResolvedValue({
      changed: true,
      action: "HIDE",
      previousStatus: PostStatus.ACTIVE,
      post: {
        id: "post-1",
        title: "스팸 글",
        status: PostStatus.HIDDEN,
      },
      targetUser: {
        id: "user-9",
        email: "spam@example.com",
        nickname: "spam-user",
        role: UserRole.USER,
      },
    } as never);
    const request = new Request("http://localhost/api/admin/moderation/posts/post-1/visibility", {
      method: "PATCH",
      body: JSON.stringify({
        action: "HIDE",
        reason: "같은 링크 반복",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        changed: true,
        post: {
          id: "post-1",
          status: "HIDDEN",
        },
      },
    });
    expect(mockToggleDirectPostVisibility).toHaveBeenCalledWith({
      moderatorId: "mod-1",
      postId: "post-1",
      input: {
        action: "HIDE",
        reason: "같은 링크 반복",
      },
    });
  });

  it("maps service errors", async () => {
    mockToggleDirectPostVisibility.mockRejectedValue(
      new ServiceError("missing", "POST_NOT_FOUND", 404),
    );
    const request = new Request("http://localhost/api/admin/moderation/posts/post-404/visibility", {
      method: "PATCH",
      body: JSON.stringify({
        action: "UNHIDE",
        reason: "오탐",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "post-404" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "POST_NOT_FOUND" },
    });
  });
});
