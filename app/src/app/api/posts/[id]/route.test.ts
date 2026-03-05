import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "@/app/api/posts/[id]/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostById } from "@/server/queries/post.queries";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";
import { deleteGuestPost, updateGuestPost } from "@/server/services/post.service";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ getPostById: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestPostPolicy: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({
  assertPostReadable: vi.fn(),
}));
vi.mock("@/server/services/post.service", () => ({
  deleteGuestPost: vi.fn(),
  deletePost: vi.fn(),
  registerPostView: vi.fn().mockResolvedValue(false),
  updateGuestPost: vi.fn(),
  updatePost: vi.fn(),
}));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetPostById = vi.mocked(getPostById);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockAssertPostReadable = vi.mocked(assertPostReadable);
const mockUpdateGuestPost = vi.mocked(updateGuestPost);
const mockDeleteGuestPost = vi.mocked(deleteGuestPost);

describe("/api/posts/[id] contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetPostById.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockAssertPostReadable.mockReset();
    mockUpdateGuestPost.mockReset();
    mockDeleteGuestPost.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockAssertPostReadable.mockResolvedValue();
  });

  it("returns POST_NOT_FOUND when post is missing", async () => {
    mockGetPostById.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-1") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "POST_NOT_FOUND" },
    });
  });

  it("returns read access service error from GET", async () => {
    mockGetPostById.mockResolvedValue({
      id: "post-1",
      status: "ACTIVE",
      scope: "GLOBAL",
      type: "FREE_POST",
      viewCount: 0,
    } as never);
    mockAssertPostReadable.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/posts/post-1") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("returns GUEST_PASSWORD_REQUIRED on guest patch without password", async () => {
    const request = new Request("http://localhost/api/posts/post-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "new" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_PASSWORD_REQUIRED" },
    });
  });

  it("uses updateGuestPost when guest password is provided", async () => {
    mockUpdateGuestPost.mockResolvedValue({ id: "post-1", title: "edited" } as never);
    const request = new Request("http://localhost/api/posts/post-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "edited", guestPassword: "1234" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(200);
    expect(mockUpdateGuestPost).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: expect.objectContaining({ ip: "127.0.0.1" }),
      }),
    );
  });

  it("returns GUEST_PASSWORD_REQUIRED on guest delete without password", async () => {
    const request = new Request("http://localhost/api/posts/post-1", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_PASSWORD_REQUIRED" },
    });
  });

  it("uses deleteGuestPost when guest password header exists", async () => {
    mockDeleteGuestPost.mockResolvedValue({ ok: true } as never);
    const request = new Request("http://localhost/api/posts/post-1", {
      method: "DELETE",
      headers: {
        "x-guest-password": "1234",
      },
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "post-1" }) });

    expect(response.status).toBe(200);
    expect(mockDeleteGuestPost).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: "post-1",
        guestPassword: "1234",
        guestIdentity: expect.objectContaining({ ip: "127.0.0.1" }),
      }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetPostById.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/posts/post-1") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
