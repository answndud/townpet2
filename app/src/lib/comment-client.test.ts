import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPostCommentPage, unwrapCommentPageResponse } from "@/lib/comment-client";

describe("comment-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("정상 응답이면 댓글 페이지 데이터를 반환한다", () => {
    expect(
      unwrapCommentPageResponse(true, {
        ok: true,
        data: {
          comments: [{ id: "comment-1" }],
          totalCount: 1,
          totalRootCount: 1,
          page: 1,
          totalPages: 1,
          limit: 30,
        },
      }),
    ).toEqual({
      comments: [{ id: "comment-1" }],
      totalCount: 1,
      totalRootCount: 1,
      page: 1,
      totalPages: 1,
      limit: 30,
    });
  });

  it("응답이 실패면 에러 메시지와 함께 예외를 던진다", () => {
    expect(() =>
      unwrapCommentPageResponse(false, {
        ok: false,
        error: { message: "댓글 로딩 실패" },
      }),
    ).toThrow("댓글 로딩 실패");
  });

  it("post 댓글 fetch helper는 no-store GET 요청으로 댓글 페이지를 가져온다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          comments: [{ id: "comment-1" }],
          totalCount: 1,
          totalRootCount: 1,
          page: 2,
          totalPages: 4,
          limit: 10,
        },
      }),
    } as Response);

    await expect(fetchPostCommentPage<{ id: string }>("post-1", { page: 2, limit: 10 })).resolves.toEqual({
      comments: [{ id: "comment-1" }],
      totalCount: 1,
      totalRootCount: 1,
      page: 2,
      totalPages: 4,
      limit: 10,
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/comments?page=2&limit=10", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  });
});
