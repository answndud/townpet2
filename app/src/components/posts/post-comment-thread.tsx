"use client";

import Link from "next/link";
import { PostStatus, ReportReason, ReportTarget } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";

import { CommentReactionControls } from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/server/actions/comment";

type CommentItem = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  status: PostStatus;
  likeCount: number;
  dislikeCount: number;
  reactions?: Array<{
    type: "LIKE" | "DISLIKE";
  }>;
  author: { id: string; name: string | null; nickname: string | null };
};

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  interactionDisabledMessage?: string;
};

type CommentFormState = {
  [key: string]: string;
};

type CommentSort = "LATEST" | "OLDEST";

const reasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위",
  OTHER: "기타",
};

function sortCommentsByCreatedAt(items: CommentItem[], sortOrder: CommentSort) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const left = a.createdAt.getTime();
    const right = b.createdAt.getTime();
    return sortOrder === "LATEST" ? right - left : left - right;
  });
  return sorted;
}

export function PostCommentThread({
  postId,
  comments,
  currentUserId,
  canInteract = true,
  loginHref = "/login",
  interactionDisabledMessage,
}: PostCommentThreadProps) {
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [reportReason, setReportReason] = useState<Record<string, ReportReason>>({});
  const [reportDescription, setReportDescription] = useState<CommentFormState>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [sortOrder, setSortOrder] = useState<CommentSort>("OLDEST");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const repliesMap = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(key, sortCommentsByCreatedAt(list, sortOrder));
    }
    return map;
  }, [comments, sortOrder]);

  const roots = useMemo(
    () =>
      sortCommentsByCreatedAt(
        comments.filter((comment) => comment.parentId === null),
        sortOrder,
      ),
    [comments, sortOrder],
  );

  const handleCreate = (parentId?: string) => {
    if (!canInteract) {
      setMessage("로그인 후 댓글을 작성할 수 있습니다.");
      return;
    }

    const content = parentId ? replyContent[parentId] : replyContent.root;
    if (!content) return;

    startTransition(async () => {
      setMessage(null);
      const result = await createCommentAction(
        postId,
        { content },
        parentId,
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
      if (parentId) {
        setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
      }
    });
  };

  const handleUpdate = (commentId: string) => {
    if (!canInteract) {
      setMessage("로그인 후 댓글을 수정할 수 있습니다.");
      return;
    }

    const content = editContent[commentId];
    if (!content) return;

    startTransition(async () => {
      setMessage(null);
      const result = await updateCommentAction(postId, commentId, { content });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setEditOpen((prev) => ({ ...prev, [commentId]: false }));
    });
  };

  const handleDelete = (commentId: string) => {
    if (!canInteract) {
      setMessage("로그인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = await deleteCommentAction(postId, commentId);
      if (!result.ok) {
        setMessage(result.message);
      }
    });
  };

  const handleReport = (commentId: string) => {
    if (!canInteract) {
      setMessage("로그인 후 신고할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: ReportTarget.COMMENT,
          targetId: commentId,
          reason: reportReason[commentId] ?? ReportReason.SPAM,
          description: reportDescription[commentId]?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload?.error?.message ?? "신고에 실패했습니다.");
        return;
      }

      setReportOpen((prev) => ({ ...prev, [commentId]: false }));
      setMessage("신고가 접수되었습니다.");
    });
  };

  const renderComment = (comment: CommentItem, depth = 0) => {
    const replies = repliesMap.get(comment.id) ?? [];
    const isAuthor = currentUserId && comment.author.id === currentUserId;
    const canEdit = isAuthor && replies.length === 0 && comment.status === "ACTIVE";

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`border border-[#dbe5f3] bg-white px-4 py-3 ${
          depth > 0 ? "ml-6" : ""
        }`}
      >
        <div className="flex items-center justify-between text-xs text-[#5f7ba5]">
          <Link href={`/users/${comment.author.id}`} className="hover:text-[#2f5da4]">
            {comment.author.nickname ?? comment.author.name ?? "익명"}
          </Link>
          <span>{comment.createdAt.toLocaleDateString("ko-KR")}</span>
        </div>
        <div className="mt-2 text-sm text-[#27466f]">
          <LinkifiedContent
            text={comment.status === "DELETED" ? "삭제된 댓글입니다." : comment.content}
            showYoutubeEmbeds
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#4f678d]">
          {depth === 0 && replies.length > 0 ? (
            <button
              type="button"
              className="border border-[#bfd0ec] bg-[#f7fbff] px-2.5 py-1 transition hover:bg-[#edf4ff]"
              onClick={() =>
                setCollapsedReplies((prev) => ({
                  ...prev,
                  [comment.id]: !prev[comment.id],
                }))
              }
            >
              {collapsedReplies[comment.id]
                ? `답글 ${replies.length}개 펼치기`
                : `답글 ${replies.length}개 접기`}
            </button>
          ) : null}
          {canInteract ? (
            <button
              type="button"
              className="border border-[#bfd0ec] bg-[#f7fbff] px-2.5 py-1 transition hover:bg-[#edf4ff]"
              onClick={() =>
                setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
              }
              disabled={comment.status !== "ACTIVE"}
            >
              답글
            </button>
          ) : null}
          {canEdit ? (
            <>
              <button
                type="button"
                className="border border-[#bfd0ec] bg-[#f7fbff] px-2.5 py-1 transition hover:bg-[#edf4ff]"
                onClick={() =>
                  setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                }
                disabled={isPending}
              >
                수정
              </button>
              <button
                type="button"
                className="border border-rose-300 bg-rose-50 px-2.5 py-1 text-rose-700 transition hover:bg-rose-100"
                onClick={() => handleDelete(comment.id)}
                disabled={isPending}
              >
                삭제
              </button>
            </>
          ) : null}
          {canInteract && !isAuthor && comment.status === "ACTIVE" ? (
            <button
              type="button"
              className="border border-[#bfd0ec] bg-[#f7fbff] px-2.5 py-1 transition hover:bg-[#edf4ff]"
              onClick={() =>
                setReportOpen((prev) => ({
                  ...prev,
                  [comment.id]: !prev[comment.id],
                }))
              }
            >
              신고
            </button>
          ) : null}
          {canInteract && !isAuthor && comment.status === "ACTIVE" ? (
            <UserRelationControls
              targetUserId={comment.author.id}
              initialState={{
                isBlockedByMe: false,
                hasBlockedMe: false,
                isMutedByMe: false,
              }}
              compact
            />
          ) : null}
        </div>

        <div className="mt-3">
          <CommentReactionControls
            postId={postId}
            commentId={comment.id}
            likeCount={comment.likeCount}
            dislikeCount={comment.dislikeCount}
            currentReaction={comment.reactions?.[0]?.type ?? null}
            canReact={canInteract && comment.status === "ACTIVE"}
            loginHref={loginHref}
          />
        </div>

        {canInteract && replyOpen[comment.id] ? (
          <div className="mt-3">
            <textarea
              className="min-h-[80px] w-full border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={replyContent[comment.id] ?? ""}
              onChange={(event) =>
                setReplyContent((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
              placeholder="답글을 입력하세요"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                onClick={() => handleCreate(comment.id)}
                disabled={isPending}
              >
                답글 등록
              </button>
            </div>
          </div>
        ) : null}

        {canInteract && editOpen[comment.id] && canEdit ? (
          <div className="mt-3">
            <textarea
              className="min-h-[80px] w-full border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={editContent[comment.id] ?? comment.content}
              onChange={(event) =>
                setEditContent((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                onClick={() => handleUpdate(comment.id)}
                disabled={isPending}
              >
                수정 저장
              </button>
            </div>
          </div>
        ) : null}

        {canInteract && reportOpen[comment.id] && !isAuthor ? (
          <div className="mt-3 border border-[#bfd0ec] bg-[#f8fbff] p-3 text-xs text-[#355988]">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-[#bfd0ec] bg-white px-2 py-1"
                value={reportReason[comment.id] ?? ReportReason.SPAM}
                onChange={(event) =>
                  setReportReason((prev) => ({
                    ...prev,
                    [comment.id]: event.target.value as ReportReason,
                  }))
                }
              >
                {Object.values(ReportReason).map((value) => (
                  <option key={value} value={value}>
                    {reasonLabels[value]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="border border-rose-300 bg-white px-2 py-1 text-rose-700 transition hover:bg-rose-50"
                onClick={() => handleReport(comment.id)}
                disabled={isPending}
              >
                접수
              </button>
            </div>
            <textarea
              className="mt-2 w-full border border-[#bfd0ec] bg-white px-2 py-1 text-xs"
              value={reportDescription[comment.id] ?? ""}
              onChange={(event) =>
                setReportDescription((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
              placeholder="상세 설명(선택)"
            />
          </div>
        ) : null}

        {replies.length > 0 && !collapsedReplies[comment.id] ? (
          <div className="mt-4 flex flex-col gap-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1f3f71]">댓글 ({comments.length})</h2>
        {roots.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#4f678d]">
            <span>정렬</span>
            <div className="inline-flex overflow-hidden border border-[#c7d7ef] bg-white">
              <button
                type="button"
                className={`px-2.5 py-1 ${
                  sortOrder === "OLDEST"
                    ? "bg-[#3567b5] text-white"
                    : "text-[#315484] hover:bg-[#f3f7ff]"
                }`}
                onClick={() => setSortOrder("OLDEST")}
              >
                오래된순
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 ${
                  sortOrder === "LATEST"
                    ? "bg-[#3567b5] text-white"
                    : "text-[#315484] hover:bg-[#f3f7ff]"
                }`}
                onClick={() => setSortOrder("LATEST")}
              >
                최신순
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-xs text-[#5a7398]">{message}</p> : null}
      <div className="mt-4">
        {canInteract ? (
          <>
            <textarea
              className="min-h-[100px] w-full border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={replyContent.root ?? ""}
              onChange={(event) =>
                setReplyContent((prev) => ({ ...prev, root: event.target.value }))
              }
              placeholder="댓글을 입력하세요"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="border border-[#3567b5] bg-[#3567b5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                onClick={() => handleCreate()}
                disabled={isPending}
              >
                댓글 등록
              </button>
            </div>
          </>
        ) : (
          <div className="border border-[#d3e0f4] bg-[#f7fbff] px-4 py-3 text-sm text-[#355988]">
            {interactionDisabledMessage ? (
              interactionDisabledMessage
            ) : (
              <>
                댓글 작성/답글/신고는 로그인 후 이용할 수 있습니다.{" "}
                <Link
                  href={loginHref}
                  className="font-semibold text-[#2f5da4] underline underline-offset-2"
                >
                  로그인하기
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {roots.length === 0 ? (
        <p className="mt-4 text-sm text-[#5a7398]">첫 댓글을 남겨주세요.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {roots.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
