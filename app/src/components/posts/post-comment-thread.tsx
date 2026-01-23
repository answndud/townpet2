"use client";

import { ReportReason, ReportTarget } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";

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
  status: "ACTIVE" | "DELETED";
  author: { id: string; name: string | null; nickname: string | null };
};

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  currentUserId?: string;
};

type CommentFormState = {
  [key: string]: string;
};

const reasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위",
  OTHER: "기타",
};

export function PostCommentThread({
  postId,
  comments,
  currentUserId,
}: PostCommentThreadProps) {
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [reportReason, setReportReason] = useState<Record<string, ReportReason>>({});
  const [reportDescription, setReportDescription] = useState<CommentFormState>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roots = useMemo(
    () => comments.filter((comment) => comment.parentId === null),
    [comments],
  );

  const repliesMap = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [comments]);

  const handleCreate = (parentId?: string) => {
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
    startTransition(async () => {
      setMessage(null);
      const result = await deleteCommentAction(postId, commentId);
      if (!result.ok) {
        setMessage(result.message);
      }
    });
  };

  const handleReport = (commentId: string) => {
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
        className={`rounded-xl border border-[#efe4d4] bg-[#fdf9f2] px-4 py-3 ${
          depth > 0 ? "ml-6" : ""
        }`}
      >
        <div className="flex items-center justify-between text-xs text-[#9a8462]">
          <span>{comment.author.nickname ?? comment.author.name ?? "익명"}</span>
          <span>{comment.createdAt.toLocaleDateString("ko-KR")}</span>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm text-[#6f6046]">
          {comment.status === "DELETED"
            ? "삭제된 댓글입니다."
            : comment.content}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#6f6046]">
          <button
            type="button"
            className="rounded-md border border-[#e3d6c4] px-2.5 py-1"
            onClick={() =>
              setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
            }
            disabled={comment.status !== "ACTIVE"}
          >
            답글
          </button>
          {canEdit ? (
            <>
              <button
                type="button"
                className="rounded-md border border-[#e3d6c4] px-2.5 py-1"
                onClick={() =>
                  setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                }
                disabled={isPending}
              >
                수정
              </button>
              <button
                type="button"
                className="rounded-md border border-[#e3d6c4] px-2.5 py-1 text-red-600"
                onClick={() => handleDelete(comment.id)}
                disabled={isPending}
              >
                삭제
              </button>
            </>
          ) : null}
          {!isAuthor && comment.status === "ACTIVE" ? (
            <button
              type="button"
              className="rounded-md border border-[#e3d6c4] px-2.5 py-1"
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
        </div>

        {replyOpen[comment.id] ? (
          <div className="mt-3">
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
                className="rounded-md border border-[#e3d6c4] bg-white px-3 py-1 text-xs"
                onClick={() => handleCreate(comment.id)}
                disabled={isPending}
              >
                답글 등록
              </button>
            </div>
          </div>
        ) : null}

        {editOpen[comment.id] && canEdit ? (
          <div className="mt-3">
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
                className="rounded-md border border-[#e3d6c4] bg-white px-3 py-1 text-xs"
                onClick={() => handleUpdate(comment.id)}
                disabled={isPending}
              >
                수정 저장
              </button>
            </div>
          </div>
        ) : null}

        {reportOpen[comment.id] && !isAuthor ? (
          <div className="mt-3 rounded-lg border border-[#e3d6c4] bg-white p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-md border border-[#e3d6c4] px-2 py-1"
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
                className="rounded-md border border-[#e3d6c4] px-2 py-1"
                onClick={() => handleReport(comment.id)}
                disabled={isPending}
              >
                접수
              </button>
            </div>
            <textarea
              className="mt-2 w-full rounded-md border border-[#e3d6c4] px-2 py-1 text-xs"
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

        {replies.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">댓글 ({comments.length})</h2>
      </div>
      {message ? <p className="mt-2 text-xs text-[#9a8462]">{message}</p> : null}
      <div className="mt-4">
        <textarea
          className="min-h-[100px] w-full rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={replyContent.root ?? ""}
          onChange={(event) =>
            setReplyContent((prev) => ({ ...prev, root: event.target.value }))
          }
          placeholder="댓글을 입력하세요"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs"
            onClick={() => handleCreate()}
            disabled={isPending}
          >
            댓글 등록
          </button>
        </div>
      </div>

      {roots.length === 0 ? (
        <p className="mt-4 text-sm text-[#9a8462]">첫 댓글을 남겨주세요.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {roots.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
