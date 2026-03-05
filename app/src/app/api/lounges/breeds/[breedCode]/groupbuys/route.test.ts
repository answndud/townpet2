import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/lounges/breeds/[breedCode]/groupbuys/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { createPost } from "@/server/services/post.service";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/post.service", () => ({ createPost: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockCreatePost = vi.mocked(createPost);

describe("POST /api/lounges/breeds/[breedCode]/groupbuys contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockCreatePost.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockCreatePost.mockResolvedValue({ id: "post-1" } as never);
  });

  it("returns INVALID_BREED_CODE for malformed breedCode", async () => {
    const request = new Request("http://localhost/api/lounges/breeds/*/groupbuys", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ breedCode: "*" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_BREED_CODE" },
    });
  });

  it("creates post with authorId for authenticated user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/lounges/breeds/golden/groupbuys", {
      method: "POST",
      body: JSON.stringify({
        title: "공구 모집",
        content: "함께 구매해요",
        productName: "사료",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(201);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "lounge-groupbuy:user-1",
      limit: 5,
      windowMs: 60_000,
    });
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
      }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/lounges/breeds/golden/groupbuys", {
      method: "POST",
      body: JSON.stringify({
        title: "공구 모집",
        content: "함께 구매해요",
        productName: "사료",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
