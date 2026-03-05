import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/suggestions/route";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPostSearchSuggestions } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/lib/post-access", () => ({ isLoginRequiredPostType: vi.fn() }));
vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({ listPostSearchSuggestions: vi.fn() }));
vi.mock("@/server/queries/user.queries", () => ({ getUserWithNeighborhoods: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockIsLoginRequiredPostType = vi.mocked(isLoginRequiredPostType);
const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockListPostSearchSuggestions = vi.mocked(listPostSearchSuggestions);
const mockGetUserWithNeighborhoods = vi.mocked(getUserWithNeighborhoods);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/posts/suggestions contract", () => {
  beforeEach(() => {
    mockIsLoginRequiredPostType.mockReset();
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockListPostSearchSuggestions.mockReset();
    mockGetUserWithNeighborhoods.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockIsLoginRequiredPostType.mockReturnValue(false);
    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockListPostSearchSuggestions.mockResolvedValue(["강아지 산책"]);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_QUERY for malformed params", async () => {
    const request = new Request("http://localhost/api/posts/suggestions?limit=0") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("returns empty list for guest when type requires login", async () => {
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue(["MARKET_LISTING"]);
    mockIsLoginRequiredPostType.mockReturnValue(true);
    const request = new Request(
      "http://localhost/api/posts/suggestions?q=사료&type=MARKET_LISTING",
    ) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { items: [] },
    });
    expect(mockListPostSearchSuggestions).not.toHaveBeenCalled();
  });

  it("uses user rate key when authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/posts/suggestions?q=사료") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "feed-suggest:user:user-1",
      }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    const request = new Request("http://localhost/api/posts/suggestions?q=사료") as NextRequest;

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
