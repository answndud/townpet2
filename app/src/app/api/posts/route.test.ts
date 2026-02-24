import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";
import { GET } from "@/app/api/posts/route";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listPosts } from "@/server/queries/post.queries";
import {
  getGuestReadLoginRequiredPostTypes,
} from "@/server/queries/policy.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request-context";
import { isLoginRequiredPostType } from "@/lib/post-access";

vi.mock("@/server/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ listPosts: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
  getGuestPostPolicy: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/lib/post-access", () => ({ isLoginRequiredPostType: vi.fn() }));
vi.mock("@/server/queries/user.queries", () => ({ getUserWithNeighborhoods: vi.fn() }));
vi.mock("@/server/services/post.service", () => ({ createPost: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListPosts = vi.mocked(listPosts);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(
  getGuestReadLoginRequiredPostTypes,
);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockGetClientIp = vi.mocked(getClientIp);
const mockIsLoginRequiredPostType = vi.mocked(isLoginRequiredPostType);

describe("GET /api/posts contract", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListPosts.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockEnforceRateLimit.mockReset();
    mockGetClientIp.mockReset();
    mockIsLoginRequiredPostType.mockReset();

    mockGetCurrentUser.mockResolvedValue(null);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockEnforceRateLimit.mockResolvedValue();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockIsLoginRequiredPostType.mockReturnValue(false);
    mockListPosts.mockResolvedValue({ items: [], nextCursor: null });
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
