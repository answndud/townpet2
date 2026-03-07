import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";
import { GET, POST } from "@/app/api/posts/route";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listPosts } from "@/server/queries/post.queries";
import {
  getGuestPostPolicy,
  getGuestReadLoginRequiredPostTypes,
} from "@/server/queries/policy.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request-context";
import { assertGuestStepUp } from "@/server/guest-step-up";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { createPost } from "@/server/services/post.service";

vi.mock("@/server/auth", () => ({
  getCurrentUserId: vi.fn(),
  hasSessionCookieFromRequest: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ listPosts: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
  getGuestPostPolicy: vi.fn(),
}));
vi.mock("@/server/guest-step-up", () => ({ assertGuestStepUp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/lib/post-access", () => ({ isLoginRequiredPostType: vi.fn() }));
vi.mock("@/server/queries/user.queries", () => ({ getUserWithNeighborhoods: vi.fn() }));
vi.mock("@/server/services/post.service", () => ({ createPost: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockHasSessionCookieFromRequest = vi.mocked(hasSessionCookieFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListPosts = vi.mocked(listPosts);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(
  getGuestReadLoginRequiredPostTypes,
);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockGetClientIp = vi.mocked(getClientIp);
const mockAssertGuestStepUp = vi.mocked(assertGuestStepUp);
const mockIsLoginRequiredPostType = vi.mocked(isLoginRequiredPostType);
const mockCreatePost = vi.mocked(createPost);

describe("GET /api/posts contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockHasSessionCookieFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListPosts.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockEnforceRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockAssertGuestStepUp.mockReset();
    mockIsLoginRequiredPostType.mockReset();
    mockCreatePost.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockHasSessionCookieFromRequest.mockReturnValue(false);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
      postRateLimit24h: 20,
    } as never);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockEnforceRateLimit.mockResolvedValue();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockAssertGuestStepUp.mockResolvedValue({
      difficulty: 2,
      riskLevel: "NORMAL",
    } as never);
    mockIsLoginRequiredPostType.mockReturnValue(false);
    mockListPosts.mockResolvedValue({ items: [], nextCursor: null });
    mockCreatePost.mockResolvedValue({ id: "post-1" } as never);
  });

  it("returns INVALID_QUERY for malformed query params", async () => {
    const request = new Request("http://localhost/api/posts?scope=INVALID") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("returns AUTH_REQUIRED for guest local feed access", async () => {
    const request = new Request("http://localhost/api/posts?scope=LOCAL") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("passes petType filter to list query", async () => {
    const request = new Request(
      "http://localhost/api/posts?scope=GLOBAL&petType=ckc7k5qsj0000u0t8qv6d1d7k",
    ) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        petTypeId: "ckc7k5qsj0000u0t8qv6d1d7k",
      }),
    );
  });

  it("maps service errors to status/code", async () => {
    const request = new Request("http://localhost/api/posts") as NextRequest;
    mockListPosts.mockRejectedValue(
      new ServiceError("rate", "RATE_LIMITED", 429),
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("skips auth lookup when session cookie is absent", async () => {
    const request = new Request("http://localhost/api/posts") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserId).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    const request = new Request("http://localhost/api/posts") as NextRequest;
    mockEnforceRateLimit.mockRejectedValue(new Error("boom"));

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});

describe("POST /api/posts contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
      postRateLimit24h: 20,
    } as never);
    mockEnforceRateLimit.mockResolvedValue();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockAssertGuestStepUp.mockResolvedValue({
      difficulty: 2,
      riskLevel: "NORMAL",
    } as never);
    mockCreatePost.mockResolvedValue({ id: "post-1" } as never);
  });

  it("returns guest step-up errors for unauthenticated writes", async () => {
    mockAssertGuestStepUp.mockRejectedValue(
      new ServiceError("need proof", "GUEST_STEP_UP_REQUIRED", 428),
    );
    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "guest post" }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(428);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_STEP_UP_REQUIRED" },
    });
    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  it("creates guest posts only after guest step-up passes", async () => {
    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "guest post", content: "hello" }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockAssertGuestStepUp).toHaveBeenCalledWith({
      scope: "post:create",
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
      token: null,
      proof: null,
    });
    expect(mockCreatePost).toHaveBeenCalledWith({
      input: { title: "guest post", content: "hello" },
      guestIdentity: {
        ip: "127.0.0.1",
        fingerprint: "guest-fp-1",
        userAgent: undefined,
      },
    });
  });
});
