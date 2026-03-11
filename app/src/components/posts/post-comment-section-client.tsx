"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { unwrapCommentListResponse } from "@/lib/comment-client";
import { emitPostCommentCountSync } from "@/lib/post-comment-count-sync";
import { POST_COMMENT_SECTION_STATE_CLASS_NAME } from "@/components/posts/post-comment-layout-class";
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
  author: { id: string; nickname: string | null; email?: string | null };
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
  onCommentCountChange?: (count: number) => void;
};

export function PostCommentSectionClient({
  postId,
  currentUserId,
  canInteract,
  canInteractWithPostOwner,
  loginHref,
  onCommentCountChange,
}: PostCommentSectionClientProps) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    () => typeof window !== "undefined" && !("IntersectionObserver" in window),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reloadComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as CommentResponse;
      const nextComments = unwrapCommentListResponse(response.ok, payload);
      if (mountedRef.current) {
        setComments(nextComments);
        setError(null);
        onCommentCountChange?.(nextComments.length);
        emitPostCommentCountSync({ postId, count: nextComments.length });
      }
    } catch {
      if (mountedRef.current) {
        setError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  }, [onCommentCountChange, postId]);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const target = containerRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }
    const timer = window.setTimeout(() => {
      void reloadComments();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reloadComments, shouldLoad]);

  if (!shouldLoad) {
    return (
      <div
        ref={containerRef}
        className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#dbe6f6] bg-white text-[#6a84ac]`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>댓글</span>
          <button
            type="button"
            onClick={() => setShouldLoad(true)}
            className="tp-btn-soft tp-btn-xs"
          >
            댓글 불러오기
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#f0d3d3] bg-[#fff7f7] text-[#8b4b4b]`}>
        {error}
      </div>
    );
  }

  if (!comments) {
    return (
      <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#dbe6f6] bg-white text-[#6a84ac]`}>
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
      onCommentsChanged={reloadComments}
      interactionDisabledMessage={
        canInteract && !canInteractWithPostOwner
          ? "차단 관계에서는 댓글 작성/답글/신고를 사용할 수 없습니다."
          : undefined
      }
    />
  );
}
