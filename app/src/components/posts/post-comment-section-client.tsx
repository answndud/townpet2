"use client";

import { useEffect, useState } from "react";

import { PostCommentThread } from "@/components/posts/post-comment-thread";

type CommentItem = {
  id: string;
  postId: string;
  parentId: string | null;
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
  reactions?: Array<{ type: "LIKE" | "DISLIKE" }>;
  author: { id: string; name: string | null; nickname: string | null; email?: string | null };
};

type CommentResponse = {
  ok: boolean;
  data?: CommentItem[];
  error?: { message?: string };
};

type PostCommentSectionClientProps = {
  postId: string;
  currentUserId?: string;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
  loginHref: string;
};

export function PostCommentSectionClient({
  postId,
  currentUserId,
  canInteract,
  canInteractWithPostOwner,
  loginHref,
}: PostCommentSectionClientProps) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: "GET",
          credentials: "same-origin",
        });
        const payload = (await response.json()) as CommentResponse;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error?.message ?? "댓글 로딩 실패");
        }
        if (!cancelled) {
          setComments(payload.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (error) {
    return (
      <div className="mt-6 rounded-sm border border-[#f0d3d3] bg-[#fff7f7] p-4 text-sm text-[#8b4b4b]">
        {error}
      </div>
    );
  }

  if (!comments) {
    return (
      <div className="mt-6 rounded-sm border border-[#dbe6f6] bg-white p-4 text-sm text-[#6a84ac]">
        댓글을 불러오는 중...
      </div>
    );
  }

  return (
    <PostCommentThread
      postId={postId}
      comments={comments as unknown as Parameters<typeof PostCommentThread>[0]["comments"]}
      currentUserId={currentUserId}
      canInteract={canInteract && canInteractWithPostOwner}
      loginHref={loginHref}
      interactionDisabledMessage={
        canInteract && !canInteractWithPostOwner
          ? "차단 관계에서는 댓글 작성/답글/신고를 사용할 수 없습니다."
          : undefined
      }
    />
  );
}
