import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/boards/[board]/posts/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommonBoardPosts } from "@/server/queries/community.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/community.queries", () => ({ listCommonBoardPosts: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListCommonBoardPosts = vi.mocked(listCommonBoardPosts);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/boards/[board]/posts contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockListCommonBoardPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockListCommonBoardPosts.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("returns 400 for invalid board params", async () => {
    const request = new Request("http://localhost/api/boards/unknown/posts") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ board: "unknown" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_BOARD" },
    });
  });

  it("returns 200 for successful response", async () => {
    const request = new Request("http://localhost/api/boards/hospital/posts?limit=5") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ board: "hospital" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockEnforceRateLimit).toHaveBeenCalledOnce();
    expect(mockListCommonBoardPosts).toHaveBeenCalledWith(
      expect.objectContaining({ commonBoardType: "HOSPITAL", limit: 5 }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    const request = new Request("http://localhost/api/boards/hospital/posts") as NextRequest;
    mockListCommonBoardPosts.mockRejectedValue(new Error("boom"));

    const response = await GET(request, {
      params: Promise.resolve({ board: "hospital" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
