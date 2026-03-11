import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/[id]/reaction/route";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";

vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    postReaction: {
      findUnique: vi.fn(),
    },
  },
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockFindUnique = vi.mocked(prisma.postReaction.findUnique);

describe("GET /api/posts/[id]/reaction contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockFindUnique.mockReset();
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
  });

  it("returns AUTH_REQUIRED when user is not authenticated", async () => {
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns current reaction type for authenticated user", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockFindUnique.mockResolvedValue({ type: "LIKE" } as never);
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { reaction: "LIKE" },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        postId_userId: {
          postId: "post-1",
          userId: "user-1",
        },
      },
      select: { type: true },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockFindUnique.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

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
