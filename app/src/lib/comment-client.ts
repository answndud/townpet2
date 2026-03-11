import type { PostCommentPageData } from "@/components/posts/post-comment-load-state";

type CommentPageData<T> = Omit<PostCommentPageData, "comments" | "bestComments"> & {
  comments: T[];
  bestComments: T[];
};

type CommentPageResponse<T> = {
  ok: boolean;
  data?: CommentPageData<T>;
  error?: { message?: string };
};

export async function fetchPostCommentPage<T>(
  postId: string,
  params?: {
    page?: number;
    limit?: number;
    forceGuestMode?: boolean;
  },
) {
  const searchParams = new URLSearchParams();
  if (params?.page) {
    searchParams.set("page", String(params.page));
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }
  const response = await fetch(
    `/api/posts/${postId}/comments${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: params?.forceGuestMode
        ? {
            "x-guest-mode": "1",
          }
        : undefined,
    },
  );
  const payload = (await response.json()) as CommentPageResponse<T>;
  return unwrapCommentPageResponse(response.ok, payload);
}

export function unwrapCommentPageResponse<T>(
  responseOk: boolean,
  payload: CommentPageResponse<T>,
) {
  if (!responseOk || !payload.ok) {
    throw new Error(payload.error?.message ?? "댓글 로딩 실패");
  }

  return (
    payload.data ?? {
      comments: [],
      bestComments: [],
      totalCount: 0,
      totalRootCount: 0,
      page: 1,
      totalPages: 1,
      limit: 30,
    }
  );
}
