import { PostScope, PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/feed/guest/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  countBestPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/community.queries", () => ({ listCommunityNavItems: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({
  countBestPosts: vi.fn(),
  listBestPosts: vi.fn(),
  listPosts: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListCommunityNavItems = vi.mocked(listCommunityNavItems);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockCountBestPosts = vi.mocked(countBestPosts);
const mockListBestPosts = vi.mocked(listBestPosts);
const mockListPosts = vi.mocked(listPosts);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/feed/guest", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockListCommunityNavItems.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockCountBestPosts.mockReset();
    mockListBestPosts.mockReset();
    mockListPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockListCommunityNavItems.mockResolvedValue([
      { id: "c000000000000000000000201", slug: "dog", labelKo: "강아지" },
      { id: "c000000000000000000000202", slug: "cat", labelKo: "고양이" },
    ]);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockCountBestPosts.mockResolvedValue(0);
    mockListBestPosts.mockResolvedValue([]);
  });

  it("returns guest feed payload with public cache headers", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        {
          id: "post-1",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "강아지 산책 코스 추천",
          content: "산책하기 좋은 공원이에요.",
          commentCount: 1,
          likeCount: 2,
          dislikeCount: 0,
          viewCount: 10,
          createdAt: new Date("2026-03-06T08:00:00.000Z"),
          author: {
            id: "user-1",
            name: "alex",
            nickname: "알렉스",
            image: null,
          },
          neighborhood: null,
          petType: null,
          images: [],
          reactions: [],
        },
      ],
      nextCursor: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/feed/guest?sort=LIKE") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=300");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "feed-guest:ip:127.0.0.1", limit: 30 }),
    );
    expect(payload.ok).toBe(true);
    expect(payload.data.view).toBe("feed");
    expect(payload.data.feed.selectedSort).toBe("LIKE");
    expect(payload.data.feed.items).toHaveLength(1);
  });

  it("returns gate payload for local-only board types", async () => {
    const response = await GET(
      new Request("http://localhost/api/feed/guest?type=MEETUP") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        view: "gate",
        gate: {
          title: "로그인 후 이용할 수 있습니다.",
          description: "MEETUP 게시판은 내 동네 기반으로 노출됩니다. 로그인 후 대표 동네를 설정해 주세요.",
          primaryLink: "/login?next=%2Ffeed%3Ftype%3DMEETUP",
          primaryLabel: "로그인하기",
          secondaryLink: "/feed",
          secondaryLabel: "전체 피드 보기",
        },
      },
    });
    expect(mockListPosts).not.toHaveBeenCalled();
  });

  it("returns 500 on unexpected errors", async () => {
    mockListCommunityNavItems.mockRejectedValue(new Error("boom"));

    const response = await GET(
      new Request("http://localhost/api/feed/guest") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(mockMonitorUnhandledError).toHaveBeenCalledTimes(1);
  });
});
