import { PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/search/guest/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listRankedSearchPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({
  listRankedSearchPosts: vi.fn(),
}));
vi.mock("@/server/queries/search.queries", () => ({
  getPopularSearchTerms: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({
  getClientIp: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockListRankedSearchPosts = vi.mocked(listRankedSearchPosts);
const mockGetPopularSearchTerms = vi.mocked(getPopularSearchTerms);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/search/guest", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockListRankedSearchPosts.mockReset();
    mockGetPopularSearchTerms.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockGetPopularSearchTerms.mockResolvedValue(["강아지 산책", "고양이 병원"]);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
  });

  it("returns guest search results with public cache headers", async () => {
    mockListRankedSearchPosts.mockResolvedValue([
      {
        id: "post-1",
        type: PostType.FREE_BOARD,
        title: "강아지 산책 코스 추천",
        content: "공원 산책 코스를 추천해요.",
        commentCount: 2,
        createdAt: new Date("2026-03-06T06:00:00.000Z"),
        author: { id: "user-1", name: "alex", nickname: "알렉스" },
      },
    ] as never);

    const response = await GET(
      new Request("http://localhost/api/search/guest?q=%EA%B0%95%EC%95%84%EC%A7%80&searchIn=TITLE") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=45, stale-while-revalidate=300");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "guest-search:ip:127.0.0.1", limit: 40 }),
    );
    expect(mockListRankedSearchPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "강아지",
        searchIn: "TITLE",
      }),
    );
    expect(payload).toEqual({
      ok: true,
      data: {
        query: "강아지",
        type: null,
        searchIn: "TITLE",
        isGuestTypeBlocked: false,
        popularTerms: ["강아지 산책", "고양이 병원"],
        items: [
          {
            id: "post-1",
            type: "FREE_BOARD",
            title: "강아지 산책 코스 추천",
            content: "공원 산책 코스를 추천해요.",
            commentCount: 2,
            createdAt: "2026-03-06T06:00:00.000Z",
            author: { id: "user-1", name: "alex", nickname: "알렉스" },
          },
        ],
      },
    });
  });

  it("suppresses blocked guest types without running ranked search", async () => {
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([PostType.MEETUP]);

    const response = await GET(
      new Request("http://localhost/api/search/guest?q=test&type=MEETUP") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockListRankedSearchPosts).not.toHaveBeenCalled();
    expect(payload).toEqual({
      ok: true,
      data: {
        query: "test",
        type: "MEETUP",
        searchIn: "ALL",
        isGuestTypeBlocked: true,
        popularTerms: ["강아지 산책", "고양이 병원"],
        items: [],
      },
    });
  });

  it("returns 500 when unexpected errors occur", async () => {
    mockGetGuestReadLoginRequiredPostTypes.mockRejectedValue(new Error("boom"));

    const response = await GET(
      new Request("http://localhost/api/search/guest?q=test") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "서버 오류가 발생했습니다.",
      },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledTimes(1);
  });
});
