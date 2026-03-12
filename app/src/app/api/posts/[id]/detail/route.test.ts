import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { GET } from "@/app/api/posts/[id]/detail/route";
import { getCurrentUserIdFromRequest, getCurrentUserRole } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostById } from "@/server/queries/post.queries";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";

vi.mock("@/server/auth", () => ({
  getCurrentUserIdFromRequest: vi.fn(),
  getCurrentUserRole: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ getPostById: vi.fn() }));
vi.mock("@/server/queries/user-relation.queries", () => ({
  getUserRelationState: vi.fn(),
}));
vi.mock("@/server/services/post-read-access.service", () => ({
  assertPostReadable: vi.fn(),
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockGetCurrentUserRole = vi.mocked(getCurrentUserRole);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetPostById = vi.mocked(getPostById);
const mockGetUserRelationState = vi.mocked(getUserRelationState);
const mockAssertPostReadable = vi.mocked(assertPostReadable);

describe("GET /api/posts/[id]/detail contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockGetCurrentUserRole.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetPostById.mockReset();
    mockGetUserRelationState.mockReset();
    mockAssertPostReadable.mockReset();

    mockGetCurrentUserIdFromRequest.mockResolvedValue("mod-1");
    mockGetCurrentUserRole.mockResolvedValue({
      id: "mod-1",
      role: UserRole.ADMIN,
    } as never);
    mockGetPostById.mockResolvedValue({
      id: "post-1",
      authorId: "user-1",
      type: "FREE_POST",
      scope: "GLOBAL",
      status: "HIDDEN",
      title: "숨김된 게시글",
      content: "본문",
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
      updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      author: { id: "user-1", nickname: "writer" },
      neighborhood: null,
      images: [],
    } as never);
    mockGetUserRelationState.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    } as never);
    mockAssertPostReadable.mockResolvedValue(undefined);
  });

  it("returns canModerate and enables moderator hidden-read access", async () => {
    const request = new Request("http://localhost/api/posts/post-1/detail") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        viewerId: "mod-1",
        canModerate: true,
        post: {
          id: "post-1",
          status: "HIDDEN",
        },
      },
    });
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1", status: "HIDDEN" }),
      "mod-1",
      {
        viewerRole: UserRole.ADMIN,
        allowModeratorHiddenRead: true,
      },
    );
  });
});
