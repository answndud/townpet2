import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { GET, POST } from "@/app/api/posts/[id]/comments/route";
import { getCurrentUserIdFromRequest, getCurrentUserRole } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getPostReadAccessById } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import { enforceRateLimit } from "@/server/rate-limit";
import { assertGuestStepUp } from "@/server/guest-step-up";
import { listComments } from "@/server/queries/comment.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { createComment } from "@/server/services/comment.service";
import {
  createGuestAuthor,
  getOrCreateGuestSystemUserId,
} from "@/server/services/guest-author.service";
import { ServiceError } from "@/server/services/service-error";
vi.mock("@/server/auth", () => ({
  getCurrentUserIdFromRequest: vi.fn(),
  getCurrentUserRole: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({ getGuestPostPolicy: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ getPostReadAccessById: vi.fn() }));
vi.mock("@/server/queries/comment.queries", () => ({ listComments: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/authenticated-write-throttle", () => ({
  enforceAuthenticatedWriteRateLimit: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/guest-step-up", () => ({ assertGuestStepUp: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({
  assertPostReadable: vi.fn(),
}));
vi.mock("@/server/services/comment.service", () => ({
  createComment: vi.fn(),
  hashGuestCommentPassword: vi.fn().mockReturnValue("hashed-password"),
}));
vi.mock("@/server/services/guest-author.service", () => ({
  createGuestAuthor: vi.fn(),
  getOrCreateGuestSystemUserId: vi.fn(),
}));
vi.mock("@/server/services/guest-safety.service", () => ({
  hashGuestIdentity: vi.fn().mockReturnValue({
    ipHash: "ip-hash",
    fingerprintHash: "fp-hash",
  }),
}));
vi.mock("@/lib/guest-ip-display", () => ({
  buildGuestIpMeta: vi.fn().mockReturnValue({
    guestIpDisplay: "127.0.*.*",
    guestIpLabel: "IPv4",
  }),
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockGetCurrentUserRole = vi.mocked(getCurrentUserRole);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetPostReadAccessById = vi.mocked(getPostReadAccessById);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceAuthenticatedWriteRateLimit = vi.mocked(enforceAuthenticatedWriteRateLimit);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockAssertGuestStepUp = vi.mocked(assertGuestStepUp);
const mockListComments = vi.mocked(listComments);
const mockAssertPostReadable = vi.mocked(assertPostReadable);
const mockCreateComment = vi.mocked(createComment);
const mockCreateGuestAuthor = vi.mocked(createGuestAuthor);
const mockGetOrCreateGuestSystemUserId = vi.mocked(getOrCreateGuestSystemUserId);

describe("POST /api/posts/[id]/comments contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockGetCurrentUserRole.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetPostReadAccessById.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockAssertGuestStepUp.mockReset();
    mockListComments.mockReset();
    mockAssertPostReadable.mockReset();
    mockCreateComment.mockReset();
    mockCreateGuestAuthor.mockReset();
    mockGetOrCreateGuestSystemUserId.mockReset();

    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockGetCurrentUserRole.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
    } as never);
    mockGetPostReadAccessById.mockResolvedValue({
      id: "post-1",
      type: "FREE_POST",
      scope: "GLOBAL",
      status: "ACTIVE",
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceAuthenticatedWriteRateLimit.mockReset();
    mockEnforceAuthenticatedWriteRateLimit.mockResolvedValue(undefined);
    mockEnforceRateLimit.mockResolvedValue();
    mockAssertGuestStepUp.mockResolvedValue({
      difficulty: 2,
      riskLevel: "NORMAL",
    } as never);
    mockListComments.mockResolvedValue({
      comments: [],
      bestComments: [],
      totalCount: 0,
      totalRootCount: 0,
      page: 1,
      totalPages: 1,
      limit: 30,
    } as never);
    mockAssertPostReadable.mockResolvedValue();
  });

  it("returns POST_NOT_FOUND for comments GET when post is missing", async () => {
    mockGetPostReadAccessById.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-1/comments") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "POST_NOT_FOUND" },
    });
  });

  it("returns service error from read access guard on comments GET", async () => {
    mockAssertPostReadable.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/posts/post-1/comments") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("disables caching for comments GET", async () => {
    mockListComments.mockResolvedValue({
      comments: [{ id: "comment-1" }],
      bestComments: [{ id: "comment-best-1" }],
      totalCount: 1,
      totalRootCount: 1,
      page: 1,
      totalPages: 1,
      limit: 30,
    } as never);
    const request = new Request("http://localhost/api/posts/post-1/comments") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("forwards page and limit query params to comment list query", async () => {
    const request = new Request(
      "http://localhost/api/posts/post-1/comments?page=3&limit=12",
    ) as NextRequest;

    await GET(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(mockListComments).toHaveBeenCalledWith("post-1", undefined, {
      page: 3,
      limit: 12,
    });
  });

  it("treats guest-mode GET as unauthenticated even when auth helper would return a user", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      headers: {
        "x-guest-mode": "1",
      },
    }) as NextRequest;

    await GET(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(mockGetCurrentUserIdFromRequest).not.toHaveBeenCalled();
    expect(mockGetPostReadAccessById).toHaveBeenCalledWith("post-1", undefined);
    expect(mockListComments).toHaveBeenCalledWith("post-1", undefined, {
      page: 1,
      limit: 30,
    });
  });

  it("passes moderator hidden-read access options on comments GET", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("mod-1");
    mockGetCurrentUserRole.mockResolvedValue({
      id: "mod-1",
      role: UserRole.MODERATOR,
    } as never);
    mockGetPostReadAccessById.mockResolvedValue({
      id: "post-1",
      type: "FREE_POST",
      scope: "LOCAL",
      status: "HIDDEN",
      neighborhoodId: "neighborhood-2",
    } as never);
    const request = new Request("http://localhost/api/posts/post-1/comments") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(200);
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1", status: "HIDDEN" }),
      "mod-1",
      {
        viewerRole: UserRole.MODERATOR,
        allowModeratorHiddenRead: true,
      },
    );
  });

  it("returns GUEST_PASSWORD_REQUIRED for guest without password", async () => {
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "hello", guestDisplayName: "익명" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_PASSWORD_REQUIRED" },
    });
  });

  it("returns GUEST_STEP_UP_REQUIRED before guest comment creation", async () => {
    mockAssertGuestStepUp.mockRejectedValue(
      new ServiceError("step-up", "GUEST_STEP_UP_REQUIRED", 428),
    );
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "hello",
        guestDisplayName: "익명",
        guestPassword: "1234",
      }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(428);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_STEP_UP_REQUIRED" },
    });
    expect(mockCreateGuestAuthor).not.toHaveBeenCalled();
  });

  it("creates guest author and writes guestAuthorId in guest comment flow", async () => {
    mockGetOrCreateGuestSystemUserId.mockResolvedValue("guest-system-user");
    mockCreateGuestAuthor.mockResolvedValue({ id: "guest-author-1" } as never);
    mockCreateComment.mockResolvedValue({ id: "comment-1" } as never);
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "hello",
        guestDisplayName: "동네손님",
        guestPassword: "1234",
      }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(201);
    expect(mockAssertGuestStepUp).toHaveBeenCalledWith({
      scope: "comment:create",
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
      token: null,
      proof: null,
    });
    expect(mockCreateGuestAuthor).toHaveBeenCalledOnce();
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "guest-system-user",
        postId: "post-1",
        guestMeta: expect.objectContaining({
          guestAuthorId: "guest-author-1",
        }),
      }),
    );
  });

  it("passes authenticated client fingerprint into comment throttling", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockCreateComment.mockResolvedValue({ id: "comment-9" } as never);
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "hello" }),
      headers: {
        "content-type": "application/json",
        "x-client-fingerprint": "device-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(201);
    expect(mockEnforceAuthenticatedWriteRateLimit).toHaveBeenCalledWith({
      scope: "comment:create",
      userId: "user-1",
      ip: "127.0.0.1",
      clientFingerprint: "device-fp-1",
    });
  });

  it("returns service error from read access guard on comments POST", async () => {
    mockAssertPostReadable.mockRejectedValue(
      new ServiceError("auth", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "hello",
        guestDisplayName: "동네손님",
        guestPassword: "1234",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetGuestPostPolicy.mockRejectedValue(new Error("policy down"));
    const request = new Request("http://localhost/api/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({
        content: "hello",
        guestDisplayName: "동네손님",
        guestPassword: "1234",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
