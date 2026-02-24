"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  guestDisplayName?: string | null;
  guestPasswordHash?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  isGuestAuthor?: boolean;
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

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

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
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [reportReason, setReportReason] = useState<Record<string, ReportReason>>({});
  const [reportDescription, setReportDescription] = useState<CommentFormState>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [guestActionPassword, setGuestActionPassword] = useState<Record<string, string>>({});
  const [guestActionPrompt, setGuestActionPrompt] = useState<Record<string, "EDIT" | "DELETE" | null>>({});
  const [sortOrder, setSortOrder] = useState<CommentSort>("OLDEST");
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canComment = canInteract || !currentUserId;

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
    if (!canComment) {
      setMessage("현재 상태에서는 댓글을 작성할 수 없습니다.");
      return;
    }

    const content = parentId ? replyContent[parentId] : replyContent.root;
    if (!content) return;
    if (!currentUserId) {
      if (!guestDisplayName.trim()) {
        const nextMessage = "비회원 닉네임을 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
      if (!guestPassword.trim()) {
        const nextMessage = "댓글 비밀번호를 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
    }

    startTransition(async () => {
      setMessage(null);
      const result = currentUserId
        ? await createCommentAction(postId, { content }, parentId)
        : await fetch(`/api/posts/${postId}/comments`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-guest-fingerprint": getGuestFingerprint(),
              "x-guest-mode": "1",
            },
            body: JSON.stringify({
              content,
              parentId,
              guestDisplayName,
              guestPassword,
            }),
          })
            .then(async (response) => {
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }

              return {
                ok: false,
                message: payload.error?.message ?? "댓글 등록에 실패했습니다.",
              } as const;
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

      if (!result.ok) {
        setMessage(result.message);
        if (!currentUserId) {
          window.alert(result.message);
        }
        return;
      }
      setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
      if (!currentUserId) {
        router.refresh();
      }
      if (parentId) {
        setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
      }
    });
  };

  const handleUpdate = (commentId: string, isGuestComment: boolean) => {
    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 수정할 수 있습니다.");
      return;
    }

    const content = editContent[commentId];
    if (!content) return;

    startTransition(async () => {
      setMessage(null);
      const result = !isGuestComment
        ? await updateCommentAction(postId, commentId, { content })
        : await (async () => {
            const password = (guestActionPassword[commentId] ?? "").trim();
            if (!password) {
              return { ok: false, message: "비밀번호가 필요합니다." } as const;
            }

            const response = await fetch(`/api/comments/${commentId}`, {
              method: "PATCH",
              headers: {
                "content-type": "application/json",
                "x-guest-fingerprint": getGuestFingerprint(),
                "x-guest-mode": "1",
              },
              body: JSON.stringify({ content, guestPassword: password }),
            });
            const payload = (await response.json()) as {
              ok: boolean;
              error?: { message?: string };
            };

            if (response.ok && payload.ok) {
              return { ok: true } as const;
            }

            return {
              ok: false,
              message: payload.error?.message ?? "댓글 수정에 실패했습니다.",
            } as const;
          })();

      if (!result.ok) {
        setMessage(result.message);
        if (isGuestComment) {
          window.alert(result.message);
        }
        return;
      }
      setEditOpen((prev) => ({ ...prev, [commentId]: false }));
      router.refresh();
    });
  };

  const handleDelete = (
    commentId: string,
    isGuestComment: boolean,
    overridePassword?: string,
  ) => {
    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = !isGuestComment
        ? await deleteCommentAction(postId, commentId)
        : await (async () => {
            const password = (overridePassword ?? guestActionPassword[commentId] ?? "").trim();
            if (!password) {
              return { ok: false, message: "비밀번호가 필요합니다." } as const;
            }

            const response = await fetch(`/api/comments/${commentId}`, {
              method: "DELETE",
              headers: {
                "content-type": "application/json",
                "x-guest-fingerprint": getGuestFingerprint(),
                "x-guest-mode": "1",
              },
              body: JSON.stringify({ guestPassword: password }),
            });
            const payload = (await response.json()) as {
              ok: boolean;
              error?: { message?: string };
            };
            if (response.ok && payload.ok) {
              return { ok: true } as const;
            }
            return {
              ok: false,
              message: payload.error?.message ?? "댓글 삭제에 실패했습니다.",
            } as const;
          })();

      if (!result.ok) {
        setMessage(result.message);
        if (isGuestComment) {
          window.alert(result.message);
        }
        return;
      }
      setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
      router.refresh();
    });
  };

  const confirmGuestAction = (commentId: string, action: "EDIT" | "DELETE") => {
    const password = (guestActionPassword[commentId] ?? "").trim();
    if (!password) {
      setMessage("댓글 비밀번호를 입력해 주세요.");
      return;
    }

    if (action === "EDIT") {
      setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
      setEditOpen((prev) => ({ ...prev, [commentId]: true }));
      return;
    }

    void handleDelete(commentId, true, password);
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
    const isGuestComment = Boolean(
      comment.isGuestAuthor || comment.guestDisplayName?.trim() || comment.guestPasswordHash,
    );
    const guestAuthorName = comment.guestDisplayName?.trim()
      ? comment.guestDisplayName
      : comment.author.nickname ?? comment.author.name ?? "익명";
    const guestIpDisplay = comment.guestIpDisplay?.trim()
      ? comment.guestIpDisplay
      : `0.${comment.author.id.slice(-3)}`;
    const isAuthor = currentUserId && comment.author.id === currentUserId;
    const hasReplyByOthers = replies.some((reply) => reply.author.id !== comment.author.id);
    const canEdit =
      (isAuthor || isGuestComment) && !hasReplyByOthers && comment.status === "ACTIVE";
    const actionLinkClass =
      "text-[12px] font-medium text-[#4a668f] transition hover:text-[#2f5da4] hover:underline disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`py-2.5 sm:py-3 ${
          depth > 0
            ? "ml-3 border-l border-l-[#cfe0f8] pl-2.5 sm:ml-4 sm:border-l sm:pl-3.5"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[12px] text-[#4f6e99]">
          {isGuestComment ? (
            <span>
              {guestAuthorName}
              {` (${comment.guestIpLabel ?? "아이피"} ${guestIpDisplay})`}
            </span>
          ) : (
            <Link href={`/users/${comment.author.id}`} className="hover:text-[#2f5da4]">
              {comment.author.nickname ?? comment.author.name ?? "익명"}
            </Link>
          )}
          <span suppressHydrationWarning className="text-[11px] text-[#6880a6]">
            {comment.createdAt.toLocaleDateString("ko-KR")}
          </span>
        </div>
        <div className="mt-1.5 text-[14px] leading-5 text-[#27466f] sm:text-[14px]">
          <LinkifiedContent
            text={comment.status === "DELETED" ? "삭제된 댓글입니다." : comment.content}
            showYoutubeEmbeds
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#3f628f]">
          {depth === 0 && replies.length > 0 ? (
            <button
              type="button"
              className={actionLinkClass}
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
          {canComment ? (
            <button
              type="button"
              className={actionLinkClass}
              onClick={() =>
                setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
              }
              disabled={comment.status !== "ACTIVE"}
            >
              {replyOpen[comment.id] ? "답글 취소" : "답글"}
            </button>
          ) : null}
          {canEdit ? (
            <>
              <button
                type="button"
                className={actionLinkClass}
                onClick={() => {
                  if (isGuestComment) {
                    setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "EDIT" }));
                    return;
                  }
                  setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                }}
                disabled={isPending}
              >
                수정
              </button>
              <button
                type="button"
                className="text-[12px] font-medium text-rose-700 transition hover:text-rose-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (isGuestComment) {
                    setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "DELETE" }));
                    return;
                  }
                  void handleDelete(comment.id, false);
                }}
                disabled={isPending}
              >
                삭제
              </button>
            </>
          ) : null}
          {canInteract && !isAuthor && comment.status === "ACTIVE" ? (
            <>
              <details className="group">
                <summary className={`list-none ${actionLinkClass}`}>더보기</summary>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-sm border border-[#dbe5f3] bg-[#f8fbff] p-1.5">
                  <button
                    type="button"
                    className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[11px] font-semibold transition hover:bg-[#edf4ff]"
                    onClick={() =>
                      setReportOpen((prev) => ({
                        ...prev,
                        [comment.id]: !prev[comment.id],
                      }))
                    }
                  >
                    신고
                  </button>
                  <UserRelationControls
                    targetUserId={comment.author.id}
                    initialState={{
                      isBlockedByMe: false,
                      hasBlockedMe: false,
                      isMutedByMe: false,
                    }}
                    compact
                  />
                </div>
              </details>
            </>
          ) : null}
        </div>

        <div className="mt-1 hidden sm:block">
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

        <details className="mt-1.5 sm:hidden">
          <summary className="list-none text-[12px] font-medium text-[#4a668f]">
            반응 보기
          </summary>
          <div className="mt-1.5 rounded-sm border border-[#dbe5f3] bg-[#f8fbff] p-1.5">
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
        </details>

          {canComment && replyOpen[comment.id] ? (
          <div className="mt-2.5">
            {!currentUserId ? (
              <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
                <input
                  className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                  value={guestDisplayName}
                  onChange={(event) => setGuestDisplayName(event.target.value)}
                  placeholder="비회원 닉네임"
                  maxLength={24}
                />
                <input
                  className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                  type="password"
                  value={guestPassword}
                  onChange={(event) => setGuestPassword(event.target.value)}
                  placeholder="댓글 비밀번호"
                  maxLength={32}
                />
              </div>
            ) : null}
            <textarea
              className="min-h-[68px] w-full border border-[#bfd0ec] bg-[#f8fbff] px-2.5 py-1.5 text-sm text-[#1f3f71]"
              value={replyContent[comment.id] ?? ""}
              onChange={(event) =>
                setReplyContent((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
              placeholder="답글을 입력하세요"
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <button
                type="button"
                className="border border-[#bfd0ec] bg-white px-3 py-1 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
                onClick={() =>
                  setReplyOpen((prev) => ({
                    ...prev,
                    [comment.id]: false,
                  }))
                }
                disabled={isPending}
              >
                취소
              </button>
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

        {isGuestComment && guestActionPrompt[comment.id] ? (
          <div className="mt-3 border border-[#dbe5f3] bg-[#f8fbff] p-2">
            <p className="mb-2 text-xs text-[#5a7398]">
              {guestActionPrompt[comment.id] === "EDIT"
                ? "수정을 위해 댓글 비밀번호를 입력해 주세요."
                : "삭제를 위해 댓글 비밀번호를 입력해 주세요."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                className="h-8 border border-[#bfd0ec] bg-white px-2.5 text-xs text-[#1f3f71]"
                placeholder="댓글 비밀번호"
                value={guestActionPassword[comment.id] ?? ""}
                onChange={(event) =>
                  setGuestActionPassword((prev) => ({
                    ...prev,
                    [comment.id]: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="h-8 border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                onClick={() =>
                  confirmGuestAction(
                    comment.id,
                    guestActionPrompt[comment.id] === "EDIT" ? "EDIT" : "DELETE",
                  )
                }
                disabled={isPending}
              >
                확인
              </button>
              <button
                type="button"
                className="h-8 border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
                onClick={() => setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: null }))}
                disabled={isPending}
              >
                취소
              </button>
            </div>
          </div>
        ) : null}

        {(canInteract || isGuestComment) && editOpen[comment.id] && canEdit ? (
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
                onClick={() => handleUpdate(comment.id, isGuestComment)}
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
          <div className="mt-2 space-y-1.5">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-md border border-[#c8d7ef] bg-white p-3 shadow-[0_8px_18px_rgba(16,40,74,0.04)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1f3f71]">댓글 {comments.length}</h2>
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

      {roots.length === 0 ? (
        <p className="mt-4 text-sm text-[#5a7398]">첫 댓글을 남겨주세요.</p>
      ) : (
        <div className="mt-3 divide-y divide-[#dbe5f3] sm:mt-4">
          {roots.map((comment) => renderComment(comment))}
        </div>
      )}

      <div className="mt-3 border-t border-[#c8d7ef] pt-2.5 sm:mt-4 sm:pt-3">
        <div className="rounded-sm border border-[#dbe6f6] bg-[#f8fbff] p-2.5 sm:p-2.5">
          {canComment ? (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6f9a]">
                댓글 작성
              </p>
              <p className="mb-1.5 text-xs text-[#5c7da8]">배려 있는 댓글 문화를 함께 만들어 주세요.</p>
              {!currentUserId ? (
                <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input
                    className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                    value={guestDisplayName}
                    onChange={(event) => setGuestDisplayName(event.target.value)}
                    placeholder="비회원 닉네임"
                    maxLength={24}
                  />
                  <input
                    className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                    type="password"
                    value={guestPassword}
                    onChange={(event) => setGuestPassword(event.target.value)}
                    placeholder="댓글 비밀번호"
                    maxLength={32}
                  />
                </div>
              ) : null}
              <textarea
                className="min-h-[78px] w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71] sm:min-h-[88px]"
                value={replyContent.root ?? ""}
                onChange={(event) =>
                  setReplyContent((prev) => ({ ...prev, root: event.target.value }))
                }
                placeholder="댓글을 입력해 주세요"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  className="border border-[#3567b5] bg-[#3567b5] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                  onClick={() => handleCreate()}
                  disabled={isPending}
                >
                  댓글 등록
                </button>
              </div>
            </>
          ) : (
            <div className="border border-[#d3e0f4] bg-white px-4 py-3 text-sm text-[#355988]">
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
      </div>
    </div>
  );
}
