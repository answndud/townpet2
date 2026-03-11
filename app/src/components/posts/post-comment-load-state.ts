export type PostCommentItem = {
  id: string;
  postId: string;
  parentId: string | null;
  threadRootId?: string | null;
  threadPage?: number | null;
  content: string;
  status: string;
  likeCount: number;
  dislikeCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  authorId: string;
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  isGuestAuthor?: boolean;
  isMutedByViewer?: boolean;
  reactions?: Array<{ type: "LIKE" | "DISLIKE" }>;
  author: { id: string; nickname: string | null; email?: string | null };
};

export type PostCommentPageData = {
  comments: PostCommentItem[];
  bestComments: PostCommentItem[];
  totalCount: number;
  totalRootCount: number;
  page: number;
  totalPages: number;
  limit: number;
};

export const DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE = 30;

export type PostCommentPrefetchState = {
  status: "idle" | "loading" | "ready" | "error";
  pageData: PostCommentPageData | null;
  error: string | null;
};

export function shouldAutoLoadPostComments({
  pageData,
  error,
  isLoading,
  prefetchStatus,
}: {
  pageData: PostCommentPageData | null;
  error: string | null;
  isLoading: boolean;
  prefetchStatus?: PostCommentPrefetchState["status"];
}) {
  if (pageData !== null || error || isLoading) {
    return false;
  }

  return prefetchStatus !== "loading" && prefetchStatus !== "ready" && prefetchStatus !== "error";
}
