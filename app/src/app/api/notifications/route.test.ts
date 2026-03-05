import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/notifications/route";
import { requireAuthenticatedUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listNotificationsByUser } from "@/server/queries/notification.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireAuthenticatedUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/notification.queries", () => ({
  listNotificationsByUser: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockRequireAuthenticatedUserId = vi.mocked(requireAuthenticatedUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListNotificationsByUser = vi.mocked(listNotificationsByUser);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/notifications contract", () => {
  beforeEach(() => {
    mockRequireAuthenticatedUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListNotificationsByUser.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockListNotificationsByUser.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
  });

  it("maps auth service error to 401", async () => {
    mockRequireAuthenticatedUserId.mockRejectedValue(
      new ServiceError("login", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/notifications") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns INVALID_QUERY for malformed query params", async () => {
    const request = new Request(
      "http://localhost/api/notifications?limit=100&cursor=invalid",
    ) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
    expect(mockListNotificationsByUser).not.toHaveBeenCalled();
  });

  it("applies rate limit with notification key and short allow cache", async () => {
    const request = new Request("http://localhost/api/notifications") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "notifications:user-1:127.0.0.1",
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    });
  });

  it("passes filters to list query and maps response payload", async () => {
    mockListNotificationsByUser.mockResolvedValue({
      items: [
        {
          id: "n-1",
          title: "새 댓글",
          body: "내용",
          isRead: false,
          createdAt: new Date("2026-03-04T00:00:00.000Z"),
          postId: "post-1",
          commentId: "comment-1",
          actor: {
            id: "actor-1",
            nickname: "petlover",
            name: "Pet Lover",
            image: "https://example.com/a.png",
          },
        },
      ],
      nextCursor: "n-2",
    } as never);
    const request = new Request(
      "http://localhost/api/notifications?kind=REACTION&unreadOnly=1&limit=12",
    ) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockListNotificationsByUser).toHaveBeenCalledWith({
      userId: "user-1",
      limit: 12,
      cursor: undefined,
      kind: "REACTION",
      unreadOnly: true,
    });
    expect(payload).toMatchObject({
      ok: true,
      data: {
        nextCursor: "n-2",
        items: [
          {
            id: "n-1",
            createdAt: "2026-03-04T00:00:00.000Z",
            actor: { id: "actor-1", nickname: "petlover" },
          },
        ],
      },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("redis down"));
    const request = new Request("http://localhost/api/notifications") as NextRequest;

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
