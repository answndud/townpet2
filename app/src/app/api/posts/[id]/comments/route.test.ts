import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/posts/[id]/comments/route";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { createComment } from "@/server/services/comment.service";
import {
  createGuestAuthor,
  getOrCreateGuestSystemUserId,
} from "@/server/services/guest-author.service";
vi.mock("@/server/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({ getGuestPostPolicy: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
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

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockCreateComment = vi.mocked(createComment);
const mockCreateGuestAuthor = vi.mocked(createGuestAuthor);
const mockGetOrCreateGuestSystemUserId = vi.mocked(getOrCreateGuestSystemUserId);

describe("POST /api/posts/[id]/comments contract", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockCreateComment.mockReset();
    mockCreateGuestAuthor.mockReset();
    mockGetOrCreateGuestSystemUserId.mockReset();

    mockGetCurrentUser.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
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
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(201);
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
