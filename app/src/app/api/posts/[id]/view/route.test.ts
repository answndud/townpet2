import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/posts/[id]/view/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { registerPostView } from "@/server/services/post.service";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/services/post.service", () => ({ registerPostView: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockRegisterPostView = vi.mocked(registerPostView);

describe("POST /api/posts/[id]/view contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockRegisterPostView.mockReset();
    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRegisterPostView.mockResolvedValue(false);
  });

  it("registers post view with authenticated user id", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/posts/post-1/view", {
      method: "POST",
      headers: { "user-agent": "test-agent" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(200);
    expect(mockRegisterPostView).toHaveBeenCalledWith({
      postId: "post-1",
      userId: "user-1",
      clientIp: "127.0.0.1",
      userAgent: "test-agent",
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockRegisterPostView.mockRejectedValue(new Error("register failed"));
    const request = new Request("http://localhost/api/posts/post-1/view", {
      method: "POST",
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
